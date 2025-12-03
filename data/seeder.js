import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// === CẤU HÌNH BAN ĐẦU ===

// Định nghĩa __dirname cho module ES (import)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load biến môi trường từ file .env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') }); 

// Import Models
import Job from '../models/Job.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Application from '../models/Application.js';

// === KẾT NỐI DATABASE ===
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`❌ DB Connection Error: ${err.message}`);
        process.exit(1);
    }
};

// === ĐỌC DỮ LIỆU TỪ JSON ===
const readData = (filename) => {
    try {
        const filePath = path.join(__dirname, filename);
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.error(`❌ Error reading data file ${filename}: ${err.message}`);
        // Trả về mảng rỗng nếu file không tồn tại hoặc lỗi, để tránh crash
        return []; 
    }
};

// Đọc tất cả dữ liệu
const users = readData('users.json');
const companies = readData('companies.json');
const jobs = readData('jobs.json');
const applications = readData('applications.json');


// === CÁC HÀM XỬ LÝ DỮ LIỆU ===

// @desc    Nhập dữ liệu vào DB
const importData = async () => {
    await connectDB();
    try {
        console.log('--- STARTING DATA IMPORT ---');

        // 1. Nhập Users
        await User.insertMany(users, { ordered: false });
        console.log('👤 Users Imported!');

        // 2. Nhập Companies
        await Company.insertMany(companies, { ordered: false });
        console.log('🏢 Companies Imported!');

        // 3. Nhập Jobs
        // *Lưu ý: Nếu Job Schema của bạn có trường customId (ví dụ: 'gs_001'), 
        // hãy đảm bảo dữ liệu trong jobs.json có trường đó.
        await Job.insertMany(jobs, { ordered: false });
        console.log('💼 Jobs Imported!');

        // 4. Nhập Applications
        await Application.insertMany(applications, { ordered: false });
        console.log('📝 Applications Imported!');

        console.log('--- DATA IMPORT COMPLETED SUCCESSFULLY! ---');
        process.exit();

    } catch (error) {
        console.error('❌ Data Import Failed!');
        console.error(error);
        process.exit(1);
    }
};

// @desc    Xóa dữ liệu khỏi DB
const destroyData = async () => {
    await connectDB();
    try {
        console.log('--- STARTING DATA DESTRUCTION ---');

        await Job.deleteMany({});
        console.log('💼 Jobs Destroyed!');

        await Company.deleteMany({});
        console.log('🏢 Companies Destroyed!');

        await Application.deleteMany({});
        console.log('📝 Applications Destroyed!');

        await User.deleteMany({});
        console.log('👤 Users Destroyed!');

        console.log('--- DATA DESTRUCTION COMPLETED SUCCESSFULLY! ---');
        process.exit();

    } catch (error) {
        console.error('❌ Data Destruction Failed!');
        console.error(error);
        process.exit(1);
    }
};

// === LOGIC XỬ LÝ LỆNH TỪ TERMINAL ===
if (process.argv[2] === '-i') {
    importData();
} else if (process.argv[2] === '-d') {
    destroyData();
} else {
    console.log("Usage: node data/seeder.js [ -i | -d ]");
    console.log(" -i: Import data (Nhập dữ liệu)");
    console.log(" -d: Destroy data (Xóa toàn bộ dữ liệu)");
    process.exit(0);
}