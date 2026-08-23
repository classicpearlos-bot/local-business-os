# META_SETUP

EXTERNAL ACTION REQUIRED: You must configure a Meta Developer App to proceed with End-to-End messaging testing.

Follow these exact step-by-step instructions:

## 1. Meta Developer Account & App Creation
1. Go to [developers.facebook.com](https://developers.facebook.com/) and log in.
2. Click **My Apps** -> **Create App**.
3. Select **Other** -> **Next**.
4. Select **Business** -> **Next**.
5. Name your app (e.g., `WhatsApp SaaS`), enter your email, and select your Business Account.
6. Click **Create app**.

## 2. Add WhatsApp Product
1. In the App Dashboard, scroll down to **WhatsApp** and click **Set up**.
2. Select your Meta Business Account and click **Continue**.
3. Meta provides you with a **Test Number** and a **Temporary Access Token**.

## 3. Webhook Configuration
1. In the left sidebar under WhatsApp, click **Configuration**.
2. Click **Edit** next to Webhook.
3. Enter your live production Callback URL (e.g., `https://your-domain.com/api/whatsapp/webhook`).
   - *Note: If you are running locally, you must use a tunneling service like Ngrok (e.g., `https://your-ngrok-url.app/api/whatsapp/webhook`).*
4. Enter a strong **Verify Token** (save this string, you will need to add it to your SaaS `.env` file).
5. Click **Verify and save**.
6. Under "Webhook fields", click **Manage** and subscribe to:
   - `messages`
   - `message_template_status_update`

## 4. SaaS Environment Configuration
Once the Meta setup is complete, you must set these environment variables in your `.env` file or hosting provider:

```env
# Meta WhatsApp Cloud API
META_API_VERSION=v19.0
META_WEBHOOK_VERIFY_TOKEN=your_secure_verify_token_from_step_3
```

## 5. Tenant Onboarding
1. Go to your SaaS application's **Settings -> WhatsApp** page.
2. Enter the **WhatsApp Business Account ID** (WABA ID) and **Phone Number ID**.
3. Paste the **Access Token**.

Once these credentials are provided, the SaaS will be fully capable of end-to-end messaging and template synchronization.
