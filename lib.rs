use anchor_lang::prelude::*;

declare_id!("GUrLuMj8yCB2T4NKaJSVqrAWWCMPMf1qtBSnDR8ytYwB");

const ADMIN_PUBKEY: &str = "administrator pubkey";

#[program]
pub mod model_marketplace {
    use super::*;

    pub fn create_model(
        ctx: Context<CreateModel>,
        url: String,
        license_type: u8,
        royalty_bps: u16,
        is_allowed: bool,
    ) -> Result<()> {
        let model = &mut ctx.accounts.model_account;

        model.creator = ctx.accounts.creator.key();
        model.url = url;
        model.license_type = license_type;
        model.royalty_bps = royalty_bps;
        model.created_at = Clock::get()?.unix_timestamp;
        model.is_active = true;
        model.parent = None;
        model.is_allowed = is_allowed;

        Ok(())
    }

    pub fn buy_license(
        ctx: Context<BuyLicense>,
        license_type: u8,
        expires_at: i64,
    ) -> Result<()> {
        require!(ctx.accounts.model_account.is_active, CustomError::ModelInactive);

        let license = &mut ctx.accounts.license_account;
        license.user = ctx.accounts.user.key();
        license.model = ctx.accounts.model_account.key();
        license.license_type = license_type;
        license.issued_at = Clock::get()?.unix_timestamp;
        license.expires_at = Some(expires_at);
        license.is_active = ctx.accounts.model_account.is_active;

        Ok(())
    }

    pub fn register_derivative_model(
        ctx: Context<RegisterDerivativeModel>,
        new_url: String,
        license_type: u8,
        royalty_bps: u16,
        is_active: bool,
        is_allowed: bool,
    ) -> Result<()> {
        let new_model = &mut ctx.accounts.new_model_account;
        let parent_model = &ctx.accounts.parent_model_account;

        require!(parent_model.is_active, CustomError::ModelInactive);
        require!(parent_model.is_allowed, CustomError::IsNotAllowed);

        new_model.creator = ctx.accounts.creator.key();
        new_model.url = new_url;
        new_model.license_type = license_type;
        new_model.royalty_bps = royalty_bps;
        new_model.created_at = Clock::get()?.unix_timestamp;
        new_model.is_active = is_active;
        new_model.parent = Some(parent_model.key());
        new_model.is_allowed = is_allowed;

        Ok(())
    }

    pub fn deactivate_model(ctx: Context<DeactivateModel>) -> Result<()> {
        let model = &mut ctx.accounts.model_account;
        require!(ctx.accounts.creator.key() == model.creator, CustomError::Unauthorized);
        model.is_active = false;
        Ok(())
    }

    pub fn revoke_license(ctx: Context<RevokeLicense>) -> Result<()> {
        let license = &mut ctx.accounts.license_account;
        require!(
            license.user == ctx.accounts.authority.key() || ctx.accounts.authority.key().to_string() == ADMIN_PUBKEY,
            CustomError::Unauthorized
        );
        license.is_active = false;
        Ok(())
    }

    pub fn update_model_url(ctx: Context<UpdateModelUrl>, new_url: String) -> Result<()> {
        let license = &mut ctx.accounts.license_account;
        let model_account = ctx.accounts.model_account.as_ref();
        require!(license.user == ctx.accounts.authority.key(), CustomError::Unauthorized);
        require!(license.is_active, CustomError::LicenseNotActive);
        require!(model_account.is_active, CustomError::ModelInactive);
        license.model = new_url;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateModel<'info> {
    #[account(
        init,
        seeds = [b"model", creator.key().as_ref()],
        bump,
        payer = creator,
        space = 8 + 32 + 4 + 256 + 1 + 2 + 8 + 1 + 33 + 1,
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
        space = 8 + 32 + 32 + 1 + 8 + 9,
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
        seeds = [b"model", creator.key().as_ref(), parent_model_account.key().as_ref()],
        bump,
        payer = creator,
        space = 8 + 32 + 4 + 256 + 1 + 2 + 8 + 1 + 33 + 1,
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

#[derive(Accounts)]
pub struct RevokeLicense<'info> {
    #[account(mut)]
    pub license_account: Account<'info, LicenseAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateModelUrl<'info> {
    #[account(mut)]
    pub license_account: Account<'info, LicenseAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub model_account: Account<'info, ModelAccount>,
}

#[account]
pub struct ModelAccount {
    pub creator: Pubkey,
    pub url: String,
    pub license_type: u8,
    pub royalty_bps: u16,
    pub created_at: i64,
    pub is_active: bool,
    pub parent: Option<Pubkey>,
    pub is_allowed: bool,
}

#[account]
pub struct LicenseAccount {
    pub user: Pubkey,
    pub model: Pubkey,
    pub license_type: u8,
    pub issued_at: i64,
    pub expires_at: Option<i64>,
}

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
    #[msg("License is not active.")]
    LicenseNotActive,
}
