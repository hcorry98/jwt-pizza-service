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

    test('getUserFranchises non-admin other user', async () => {
        let nonAdminUser = { name: randomName(), email: randomName() + '@test.com', password: 'a', roles: [{role: Role.Diner}] };
        nonAdminUser = await DB.addUser(nonAdminUser);
        nonAdminUser.password = 'a';

        const loginRes = await request(app).put('/api/auth').send(nonAdminUser);
        const token = loginRes.body.token;

        const getUserFranchisesRes = await request(app).get('/api/franchise/' + adminUser.id).set('Authorization', 'Bearer ' + token);
        expect(getUserFranchisesRes.status).toBe(200);
        expect(getUserFranchisesRes.body).toEqual([]);

        await DB.deleteUser(nonAdminUser.id);
    });

    test('createFranchise', async () => {
        const franchise = { name: randomName(), admins: [{ email: adminUser.email }] };
        const createFranchiseRes = await request(app).post('/api/franchise').set('Authorization', 'Bearer ' + adminUserAuthToken).send(franchise);
        expect(createFranchiseRes.status).toBe(200);
        expect(createFranchiseRes.body).toMatchObject(franchise);

        await DB.deleteFranchise(createFranchiseRes.body.id);
    });

    test('createFranchise non-admin', async () => {
        let nonAdminUser = { name: randomName(), email: randomName() + '@test.com', password: 'a', roles: [{role: Role.Diner}] };
        nonAdminUser = await DB.addUser(nonAdminUser);
        nonAdminUser.password = 'a';

        const loginRes = await request(app).put('/api/auth').send(nonAdminUser);
        const token = loginRes.body.token;

        const franchise = { name: randomName(), admins: [{ email: nonAdminUser.email }] };
        const createFranchiseRes = await request(app).post('/api/franchise').set('Authorization', 'Bearer ' + token).send(franchise);
        expect(createFranchiseRes.status).toBe(403);
        expect(createFranchiseRes.body.message).toBe('unable to create a franchise');

        await DB.deleteUser(nonAdminUser.id);
    });

    test('deleteFranchise', async () => {
        const franchise = { name: randomName(), admins: [{ email: adminUser.email }] };
        const franchiseRes = await DB.createFranchise(franchise);

        const deleteFranchiseRes = await request(app).delete('/api/franchise/' + franchiseRes.id).set('Authorization', 'Bearer ' + adminUserAuthToken);
        expect(deleteFranchiseRes.status).toBe(200);
        expect(deleteFranchiseRes.body.message).toBe('franchise deleted');
    });

    test('deleteFranchise non-admin', async () => {
        let nonAdminUser = { name: randomName(), email: randomName() + '@test.com', password: 'a', roles: [{role: Role.Diner}] };
        nonAdminUser = await DB.addUser(nonAdminUser);
        nonAdminUser.password = 'a';

        const loginRes = await request(app).put('/api/auth').send(nonAdminUser);
        const token = loginRes.body.token;

        const franchise = { name: randomName(), admins: [{ email: nonAdminUser.email }] };
        const franchiseRes = await DB.createFranchise(franchise);

        const deleteFranchiseRes = await request(app).delete('/api/franchise/' + franchiseRes.id).set('Authorization', 'Bearer ' + token);
        expect(deleteFranchiseRes.status).toBe(403);
        expect(deleteFranchiseRes.body.message).toBe('unable to delete a franchise');

        await DB.deleteFranchise(franchiseRes.id);
        await DB.deleteUser(nonAdminUser.id);
    });

    test('createStore', async () => {
        const store = { franchiseId: franchiseId, name: randomName() };
        const createStoreRes = await request(app).post('/api/franchise/' + franchiseId + '/store').set('Authorization', 'Bearer ' + adminUserAuthToken).send(store);
        expect(createStoreRes.status).toBe(200);
        expect(createStoreRes.body).toMatchObject(store);

        await DB.deleteStore(franchiseId, createStoreRes.body.id);
    });

    test('createStore non-admin', async () => {
        let nonAdminUser = { name: randomName(), email: randomName() + '@test.com', password: 'a', roles: [{role: Role.Diner}] };
        nonAdminUser = await DB.addUser(nonAdminUser);
        nonAdminUser.password = 'a';

        const loginRes = await request(app).put('/api/auth').send(nonAdminUser);
        const token = loginRes.body.token;

        const store = { franchiseId: franchiseId, name: randomName() };
        const createStoreRes = await request(app).post('/api/franchise/' + franchiseId + '/store').set('Authorization', 'Bearer ' + token).send(store);
        expect(createStoreRes.status).toBe(403);
        expect(createStoreRes.body.message).toBe('unable to create a store');

        await DB.deleteUser(nonAdminUser.id);
    });

    test('deleteStore', async () => {
        const store = { franchiseId: franchiseId, name: randomName() };
        const storeRes = await DB.createStore(franchiseId, store);

        const deleteStoreRes = await request(app).delete('/api/franchise/' + franchiseId + '/store/' + storeRes.id).set('Authorization', 'Bearer ' + adminUserAuthToken);
        expect(deleteStoreRes.status).toBe(200);
        expect(deleteStoreRes.body.message).toBe('store deleted');
    });

    test('deleteStore non-admin', async () => {
        let nonAdminUser = { name: randomName(), email: randomName() + '@test.com', password: 'a', roles: [{role: Role.Diner}] };
        nonAdminUser = await DB.addUser(nonAdminUser);
        nonAdminUser.password = 'a';

        const loginRes = await request(app).put('/api/auth').send(nonAdminUser);
        const token = loginRes.body.token;

        const store = { franchiseId: franchiseId, name: randomName() };
        const storeRes = await DB.createStore(franchiseId, store);

        const deleteStoreRes = await request(app).delete('/api/franchise/' + franchiseId + '/store/' + storeRes.id).set('Authorization', 'Bearer ' + token);
        expect(deleteStoreRes.status).toBe(403);
        expect(deleteStoreRes.body.message).toBe('unable to delete a store');

        await DB.deleteStore(franchiseId, storeRes.id);
        await DB.deleteUser(nonAdminUser.id);
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