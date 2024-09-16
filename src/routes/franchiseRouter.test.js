const request = require('supertest');
const app = require('../service');
const { DB } = require('../database/database.js');
const { Role } = require('../database/database');

describe('franchiseRouter', () => {
    let adminUser;
    let adminUserAuthToken;
    let franchiseId;

    beforeAll(async () => {
        const adminRes = await createAdminUser();
        adminUser = adminRes.user;
        adminUserAuthToken = adminRes.token;

        const franchise = { name: randomName(), admins: [{ email: adminUser.email }] };
        const franchiseRes = await DB.createFranchise(franchise);
        franchiseId = franchiseRes.id;
    });

    afterAll(async () => {
        await DB.deleteUser(adminUser.id);
        await DB.deleteFranchise(franchiseId);
    });

    test('getFranchises', async () => {
        const getFranchisesRes = await request(app).get('/api/franchise').set('Authorization', 'Bearer ' + adminUserAuthToken);
        expect(getFranchisesRes.status).toBe(200);
        const franchiseRes = getFranchisesRes.body;
        expect(franchiseRes).toEqual(expect.arrayContaining([expect.objectContaining({ id: franchiseId })]));
    });

    test('getUserFranchises', async () => {
        const getUserFranchisesRes = await request(app).get('/api/franchise/' + adminUser.id).set('Authorization', 'Bearer ' + adminUserAuthToken);
        expect(getUserFranchisesRes.status).toBe(200);
        const franchiseRes = getUserFranchisesRes.body;
        expect(franchiseRes).toEqual(expect.arrayContaining([expect.objectContaining({ id: franchiseId })]));
    });
});

async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';

    user = await DB.addUser(user);
    user.password = 'toomanysecrets';

    const loginRes = await request(app).put('/api/auth').send(user);
    const token = loginRes.body.token;
    return {user, token};
}

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minutes
}