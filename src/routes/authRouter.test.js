const request = require('supertest');
const app = require('../service');
const { DB } = require('../database/database.js');
const { Role } = require('../database/database');

describe('authRouter', () => {
    const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
    let testUserAuthToken;
    let testUserId;

    beforeEach(async () => {
        testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
        let setupRegisterRes = await request(app).post('/api/auth').send(testUser);
        testUserAuthToken = setupRegisterRes.body.token;
        testUserId = setupRegisterRes.body.user.id;
    });

    afterEach(async () => {
        await DB.deleteUser(testUserId);
    });

    test('login', async () => {
        const loginRes = await request(app).put('/api/auth').send(testUser);
        expect(loginRes.status).toBe(200);
        expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

        const { password, ...user } = { ...testUser, roles: [{ role: Role.Diner }] };
        expect(loginRes.body.user).toMatchObject(user);
        expect(password).toBe(testUser.password);
    });

    test('login incorrect password', async () => {
        testUser.password = 'wrongpassword';
        const loginRes = await request(app).put('/api/auth').send(testUser);
        expect(loginRes.status).toBe(404);
        expect(loginRes.body.message).toBe('unknown user');
    });

    test('logout', async () => {
        const logoutRes = await request(app).delete('/api/auth').set('Authorization', 'Bearer ' + testUserAuthToken);
        expect(logoutRes.status).toBe(200);
        expect(logoutRes.body.message).toBe('logout successful');
    });

    test('register', async () => {
        const registerRes = await request(app).post('/api/auth').send(testUser);
        expect(registerRes.status).toBe(200);
        expect(registerRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

        const { password, ...userWithoutPassword } = { ...testUser, roles: [{ role: Role.Diner }] };
        expect(registerRes.body.user).toMatchObject(userWithoutPassword);
        expect(password).toBe(testUser.password);

        await DB.deleteUser(registerRes.body.user.id);
    });

    test('register missing name', async () => {
        delete testUser.name;
        const registerRes = await request(app).post('/api/auth').send(testUser);
        expect(registerRes.status).toBe(400);
        expect(registerRes.body.message).toBe('name, email, and password are required');
        testUser.name = 'pizza diner';
    });

    test('updateUser', async () => {
        testUser.password = 'newpassword';
        testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
        const updateUserRes = await request(app).put('/api/auth/' + testUserId).set('Authorization', 'Bearer ' + testUserAuthToken).send(testUser);
        expect(updateUserRes.status).toBe(200);

        const {password, ...userWithoutPassword} = { ...testUser, roles: [{ role: Role.Diner }] };
        expect(updateUserRes.body).toMatchObject(userWithoutPassword);
        expect(password).toBe(testUser.password);
    });

    test('updateUser incorrect user', async () => {
        testUser.password = 'newpassword';
        testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
        const updateUserRes = await request(app).put('/api/auth/' + 'wrongId').set('Authorization', 'Bearer ' + testUserAuthToken).send(testUser);
        expect(updateUserRes.status).toBe(403);
    });

    test('updateUser unauthorized', async () => {
        testUser.password = 'newpassword';
        testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
        const updateUserRes = await request(app).put('/api/auth/' + testUserId).send(testUser);
        expect(updateUserRes.status).toBe(401);
    });
});

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minutes
}
