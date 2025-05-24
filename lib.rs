use anchor_lang::prelude::*;
//use std::time::Duration;

declare_id!("GUrLuMj8yCB2T4NKaJSVqrAWWCMPMf1qtBSnDR8ytYwB");

//const ADMIN_PUBKEY: &str = "administrator pubkey";

#[program]
pub mod model_marketplace {
    use super::*;

    pub fn create_model(
        ctx: Context<CreateModel>,
        model_name: String,
        url: String,
        royalty_bps: u16,
        is_allowed: bool,
    ) -> Result<()> {
        let (model_pda, _bump) = Pubkey::find_program_address(
            &[
                b"model", ctx.accounts.creator.key().as_ref(),
                model_name.as_bytes()
            ],
            ctx.program_id,
        );
        require!(
            model_pda == ctx.accounts.model_account.key(),
            CustomError::OwnerMismatch
        );

        let model = &mut ctx.accounts.model_account;

        model.creator = ctx.accounts.creator.key();
        model.model_name = model_name;
        model.url = url;
        model.royalty_bps = royalty_bps;
        model.created_at = Clock::get()?.unix_timestamp;
        model.is_active = true;     // 벡엔드에서 모델의 실제 작동여부를 파악해 bool형으로 등록/수정
        model.parent = None;
        model.is_allowed = is_allowed;

        Ok(())
    }

    pub fn buy_license(
        ctx: Context<BuyLicense>,
        license_type: u8,
    ) -> Result<()> {
        require!(ctx.accounts.model_account.is_active, CustomError::ModelInactive);

        let license = &mut ctx.accounts.license_account;
        license.user = ctx.accounts.user.key();
        license.model = ctx.accounts.model_account.key();
        license.license_type = license_type;
        license.issued_at = Clock::get()?.unix_timestamp;
        license.is_active = ctx.accounts.model_account.is_active;

        Ok(())
    }

    pub fn register_derivative_model(
        ctx: Context<RegisterDerivativeModel>,
        model_name: String,
        new_url: String,
        royalty_bps: u16,
        is_active: bool,
        is_allowed: bool,
    ) -> Result<()> {
        let (new_model_pda, _bump) = Pubkey::find_program_address(
            &[
                b"model", ctx.accounts.creator.key().as_ref(),
                model_name.as_bytes()
            ],
            ctx.program_id,
        );
        require!(
            new_model_pda == ctx.accounts.new_model_account.key(),
            CustomError::OwnerMismatch
        );

        let new_model = &mut ctx.accounts.new_model_account;
        let parent_model = &ctx.accounts.parent_model_account;

        require!(parent_model.is_active, CustomError::ModelInactive);
        require!(parent_model.is_allowed, CustomError::IsNotAllowed);

        new_model.creator = ctx.accounts.creator.key();
        new_model.model_name = model_name;
        new_model.url = new_url;
        new_model.royalty_bps = royalty_bps;
        new_model.created_at = Clock::get()?.unix_timestamp;
        new_model.is_active = is_active;        // 벡엔드에서 모델의 실제 작동여부를 파악해 bool형으로 등록/수정
        new_model.parent = Some(parent_model.key().to_string());
        new_model.is_allowed = is_allowed;

        Ok(())
    }

    pub fn deactivate_model(ctx: Context<DeactivateModel>) -> Result<()> {
        let model = &mut ctx.accounts.model_account;
        require!(ctx.accounts.creator.key() == model.creator, CustomError::Unauthorized);
        model.is_active = false;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateModel<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 4 + 256 + 4 + 256 + 2 + 8 + 1 + 1 + 4 + 256 + 1, // discriminator + all fields
    )]
    pub model_account: Account<'info, ModelAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyLicense<'info> {
    #[account(
        init,
        seeds = [b"license", model_account.key().as_ref(), user.key().as_ref()],
        bump,
        payer = user,
        space = 8 + 32 + 32 + 1 + 8 + 1, // discriminator + all fields
    )]
    pub license_account: Account<'info, LicenseAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub model_account: Account<'info, ModelAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterDerivativeModel<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 4 + 256 + 4 + 256 + 2 + 8 + 1 + 1 + 4 + 256 + 1, // discriminator + all fields
    )]
    pub new_model_account: Account<'info, ModelAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(mut)]
    pub parent_model_account: Account<'info, ModelAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeactivateModel<'info> {
    #[account(mut)]
    pub model_account: Account<'info, ModelAccount>,
    pub creator: Signer<'info>,
}

#[account]
#[derive(Default)]
pub struct ModelAccount {
    pub model_name: String,    // 4 + 256 bytes
    pub creator: Pubkey,       // 32 bytes
    pub url: String,          // 4 + 256 bytes
    pub royalty_bps: u16,     // 2 bytes
    pub created_at: i64,      // 8 bytes
    pub is_active: bool,      // 1 byte
    pub parent: Option<String>, // 1 + 4 + 256 bytes (Option + String)
    pub is_allowed: bool,     // 1 byte
}

#[account]
#[derive(Default)]
pub struct LicenseAccount {
    pub user: Pubkey,         // 32 bytes
    pub model: Pubkey,        // 32 bytes
    pub license_type: u8,     // 1 byte
    pub issued_at: i64,       // 8 bytes
    pub is_active: bool,      // 1 byte
}

/*
#[account]
pub struct Config {
    pub admin: Pubkey,
    pub model_count: u64,
}
*/

#[error_code]
pub enum CustomError {
    #[msg("This model is deactivated")]
    ModelInactive,
    #[msg("Not authorized")]
    Unauthorized,
    #[msg("This model does not allow fine-tuning")]
    IsNotAllowed,
    #[msg("Owner mismatch.")]
    OwnerMismatch,
}
