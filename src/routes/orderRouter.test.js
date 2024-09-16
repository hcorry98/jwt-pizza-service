const request = require('supertest');
const app = require('../service');
const { DB } = require('../database/database.js');
const { Role } = require('../database/database');

describe('orderRouter', () => {

    const veggiePizza = { title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' };
    const studentPizza = { title: 'Student', description: 'No topping, no sauce, just carbs', image: 'pizza9.png', price: 0.0001 };
    const pizzas = [veggiePizza, studentPizza];
    let adminUser;
    let adminUserAuthToken;
    let pizzaIds = [];

    beforeAll(async () => {
        const {user, token} = await createAdminUser();
        adminUser = user;
        adminUserAuthToken = token;
    });

    beforeEach(async () => {
        let setupRes;
        for (const pizza of pizzas) {
            setupRes = await request(app).put('/api/order/menu').set('Authorization', 'Bearer ' + adminUserAuthToken).send(pizza);
            const ids = setupRes.body;
            pizzaIds.push(ids[ids.length - 1].id);
            pizza.id = ids[ids.length - 1].id;
        }
    });

    afterEach(async () => {
        for (const id of pizzaIds) {
            await DB.deleteMenuItem(id);
        }
    });

    afterAll(async () => {
        await DB.deleteUser(adminUser.id);
    });

    test('getMenu', async () => {
        const getMenuRes = await request(app).get('/api/order/menu');
        expect(getMenuRes.status).toBe(200);
        expect(getMenuRes.body).toEqual(expect.arrayContaining([veggiePizza, studentPizza]));
    });

    test('addMenuItem', async () => {
        const newPizza = { title: 'Meat', description: 'All the meats', image: 'pizza2.png', price: 0.0045 };
        const addMenuItemRes = await request(app).put('/api/order/menu').set('Authorization', 'Bearer ' + adminUserAuthToken).send(newPizza);

        expect(addMenuItemRes.status).toBe(200);
        const newPizzaId = addMenuItemRes.body[addMenuItemRes.body.length - 1].id;
        newPizza.id = newPizzaId;
        expect(addMenuItemRes.body).toEqual(expect.arrayContaining([...pizzas, newPizza]));

        await DB.deleteMenuItem(newPizzaId);
    });

    test('addMenuItem not admin', async () => {
        const newPizza = { title: 'Meat', description: 'All the meats', image: 'pizza2.png', price: 0.0045 };
        let user = { name: 'pizza diner', email: 'normaljoe@pizza.com', password: 'a', roles: [{ role: Role.Diner }] };
        user = await DB.addUser(user);
        user.password = 'a';
        const res = await request(app).put('/api/auth').send(user);
        const token = res.body.token;

        const addMenuItemRes = await request(app).put('/api/order/menu').set('Authorization', 'Bearer ' + token).send(newPizza);
        expect(addMenuItemRes.status).toBe(403);
        expect(addMenuItemRes.body.message).toBe('unable to add menu item');

        await DB.deleteUser(user.id);
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