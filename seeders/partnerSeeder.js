require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { dbConnection } = require('../database/config');
const Usuario = require('../models/usuario');

const seedUsers = async () => {
    try {
        await dbConnection();

        const usersData = [
            { username: 'partner1', email: 'partner1@example.com', password: 'password1', role: 'PARTNER', terminos: true, google: false },
            { username: 'partner2', email: 'partner2@example.com', password: 'password2', role: 'PARTNER', terminos: true, google: false },
            { username: 'partner3', email: 'partner3@example.com', password: 'password3', role: 'PARTNER', terminos: true, google: false },
            { username: 'partner4', email: 'partner4@example.com', password: 'password4', role: 'PARTNER', terminos: true, google: false },
            { username: 'partner5', email: 'partner5@example.com', password: 'password5', role: 'PARTNER', terminos: true, google: false },
        ];

        for (const userData of usersData) {
            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync(userData.password, salt);
            userData.password = hashedPassword;

            const user = new Usuario(userData);
            await user.save();
            console.log(`User ${user.username} created.`);
        }

        console.log('Seeder completed successfully.');
        mongoose.connection.close();
    } catch (error) {
        console.error('Error seeding users:', error);
        mongoose.connection.close();
    }
};

seedUsers();
