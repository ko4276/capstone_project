"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFolderToPinata = void 0;
const fs_1 = __importDefault(require("fs"));
const form_data_1 = __importDefault(require("form-data"));
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const PINATA_JWT = process.env.PINATA_JWT;
const uploadFolderToPinata = async (files) => {
    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
    const folderName = `upload_${(0, uuid_1.v4)()}`; // 매번 고유 폴더 생성
    const formData = new form_data_1.default();
    files.forEach(file => {
        const relativePath = path_1.default.join(folderName, file.originalname);
        formData.append('file', fs_1.default.createReadStream(file.path), { filepath: relativePath });
    });
    const pinataMetadata = JSON.stringify({
        name: folderName,
    });
    formData.append("pinataMetadata", pinataMetadata);
    const response = await axios_1.default.post(url, formData, {
        maxBodyLength: Infinity,
        headers: {
            Authorization: `Bearer ${PINATA_JWT}`,
            ...formData.getHeaders(),
        },
    });
    return response.data.IpfsHash;
};
exports.uploadFolderToPinata = uploadFolderToPinata;
