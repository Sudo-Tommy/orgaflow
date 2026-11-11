import { getAdminPb, createClientPb } from './src/services/pb.js';
import PocketBase from 'pocketbase';

async function test() {
    const pbAdmin = await getAdminPb();
    const app = await pbAdmin.collection('appointments').getOne('j7z3zejxikyf7vw');
    console.log("App assigned user:", app.user);

    // Get the user
    const user = await pbAdmin.collection('users').getOne(app.user);
    console.log("User email:", user.email, "role:", user.role);

    // Create client as this user
    const clientPb = new PocketBase('http://127.0.0.1:8090');
    // Auth as this user (we can generate an auth token or impersonate)
    // In PB, admin can generate token for user or authWithPassword
    // Let's test with PB createClientPb with user token:
    // To get token:
    const token = pbAdmin.files.getURL; // wait, let's use impersonate or auth
    // Let's check updateRule of appointments:
    const col = await pbAdmin.collections.getOne('appointments');
    console.log("appointments updateRule:", col.updateRule);
}

test();
