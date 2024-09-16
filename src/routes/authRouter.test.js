const request = require('supertest');
const app = require('../service');
const { DB } = require('../database/database.js');
const { Role } = require('../database/database');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let testUserId;

beforeAll(async () => {
    testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;
    testUserId = registerRes.body.user.id;
});

test('register', async () => {
    const registerRes = await request(app).post('/api/auth').send(testUser);
    expect(registerRes.status).toBe(200);
    expect(registerRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

    const { password, ...userWithoutPassword } = { ...testUser, roles: [{ role: Role.Diner }] };
    expect(registerRes.body.user).toMatchObject(userWithoutPassword);
    expect(password).toBe(testUser.password);
});

test('login', async () => {
    const loginRes = await request(app).put('/api/auth').send(testUser);
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

    const { password, ...user } = { ...testUser, roles: [{ role: Role.Diner }] };
    expect(loginRes.body.user).toMatchObject(user);
    expect(password).toBe(testUser.password);
});

test('updateUser', async () => {
    const user = testUser;
    user.password = 'newpassword';
    user.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const updateUserRes = await request(app).put('/api/auth/' + testUserId).set('Authorization', 'Bearer ' + testUserAuthToken).send(user);
    expect(updateUserRes.status).toBe(200);

    const {password, ...userWithoutPassword} = { ...user, roles: [{ role: Role.Diner }] };
    expect(updateUserRes.body).toMatchObject(userWithoutPassword);
    expect(password).toBe(user.password);
});

test('logout', async () => {
    const logoutRes = await request(app).delete('/api/auth').set('Authorization', 'Bearer ' + testUserAuthToken);
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toBe('logout successful');
});

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';

    await DB.addUser(user);

    user.password = 'toomanysecrets';
    return user;
}

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minutes
}