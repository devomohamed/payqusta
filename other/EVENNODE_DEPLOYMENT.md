# Deploying PayQusta to EvenNode 🚀

This guide provides step-by-step instructions for deploying your PayQusta application to your EvenNode server.

## Step 1: Set Your MongoDB Password

Your MongoDB database on EvenNode currently has the password set to **`NOT SET`**. You must resolve this first.

1. Go to your EvenNode dashboard for the `payqusta.eu-4.evennode.com` app.
2. Scroll down to the **MongoDB** section.
3. Next to "Password", click **Change password**.
4. Set a strong password and save it securely. You will need it in Step 4.

## Step 2: Set Up Git Deployment Keys

To push code directly from your local machine to EvenNode, you need to add your SSH key to their system.

1. **Check for an existing key:** Open a terminal in Windows (Git Bash or PowerShell) and run:
   ```bash
   cat ~/.ssh/id_rsa.pub
   # or
   cat ~/.ssh/id_ed25519.pub
   ```
   If it prints a long string starting with `ssh-rsa` or `ssh-ed25519`, copy that string.

2. **Generate a new key (if you don't have one):**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```
   Press Enter to accept the defaults, then run the `cat` command in step 2.1 to copy it.

3. **Add the key to EvenNode:**
   - On the EvenNode dashboard, find the **Git deployment** section.
   - Click on **Manage public keys** next to "Public keys (NOT SET)".
   - Paste your copied key and save it.

## Step 3: Add the EvenNode Remote to Git

You need to tell Git where to send your code. In your project's root folder (`d:\New folder (3)\payqusta`), open your terminal and run:

```bash
git remote add evennode git@git.evennode.com:a4db4a6edf8c80b2aee59a074f8bbad2.git
```

## Step 4: Configure Environment Variables

Before deploying, make sure the app has the right environment variables set up on the EvenNode server so it can connect to the database and function properly.

1. On the EvenNode dashboard, go to the **Environment vars** section (on the left menu).
2. Add the following required keys:
   - `NODE_ENV`: `production`
   - `PORT`: (Leave this out or let EvenNode handle it automatically. Usually, they pass the port).
   - `JWT_SECRET`: Generate a random long string for this (e.g. `your_super_secret_jwt_key_here`).
   - `CLIENT_URL`: `https://payqusta.eu-4.evennode.com`
   - `MONGO_URI`: `mongodb://a4db4a6edf8c80b2aee59a074f8bbad2:payqusta@17a.mongo.evennode.com:27031,17b.mongo.evennode.com:27031/a4db4a6edf8c80b2aee59a074f8bbad2?replicaSet=eu-17&ssl=true`

## Step 5: Push the Code

Make sure your code is committed, then push it to EvenNode:

```bash
git add .
git commit -m "Configure EvenNode deployment - add postinstall script"
git push evennode master
```
*(If your main branch is called `main`, run `git push evennode main:master` instead).*

## Step 6: Monitor Deployment

1. Once you push, you will see output in the terminal showing the build process. EvenNode will run the newly added `postinstall` script, which will install your frontend dependencies and build the Vite React app.
2. In the EvenNode Dashboard, under the **Latest activity** or **Logs** sections, you can verify if the app started correctly.

You should now be able to visit https://payqusta.eu-4.evennode.com and see your app live!
