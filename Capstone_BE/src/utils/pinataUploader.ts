import fs from "fs";
import FormData from "form-data";
import axios from "axios";
import path from "path";
import { v4 as uuidv4 } from 'uuid';

const PINATA_JWT = process.env.PINATA_JWT!;

export const uploadFolderToPinata = async (files: Express.Multer.File[]): Promise<string> => {
  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
  const folderName = `upload_${uuidv4()}`; // 매번 고유 폴더 생성

  const formData = new FormData();

  files.forEach(file => {
    const relativePath = path.join(folderName, file.originalname);
    formData.append('file', fs.createReadStream(file.path), { filepath: relativePath });
  });

  const pinataMetadata = JSON.stringify({
    name: folderName,
  });
  formData.append("pinataMetadata", pinataMetadata);

  const response = await axios.post(url, formData, {
    maxBodyLength: Infinity,
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      ...formData.getHeaders(),
    },
  });

  return response.data.IpfsHash;
};
