# Email Verification Setup Guide

## Issues Fixed

### 1. ✅ Email Verification Status Clarity
- Added clear verification status checking in login and signup flows
- Users now receive specific messages about whether their email is verified or not
- Error messages differentiate between "invalid credentials" and "email not verified"

### 2. ✅ Email Redirect URL Configuration
- Updated signup route to use production domain for email verification redirects
- Enhanced callback route to properly handle verified users and create profiles
- Frontend pages now display clear success/error messages

## Required Supabase Configuration

To complete the email verification setup, you need to configure your Supabase project:

### Step 1: Configure Site URL

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project: `eoxoiqeswazggavqnocx`
3. Navigate to: **Authentication** → **URL Configuration**
4. Set the **Site URL** to: `https://bluesminds.com`

### Step 2: Configure Redirect URLs

In the same **URL Configuration** section, add these **Redirect URLs**:

```
https://bluesminds.com/api/auth/callback
https://bluesminds.com/dashboard
https://bluesminds.com/login
https://bluesminds.com/*
```

**Note:** The wildcard `https://bluesminds.com/*` allows all paths under your domain.

### Step 3: Enable Email Confirmations

1. In Supabase Dashboard, go to: **Authentication** → **Email Templates**
2. Make sure **Confirm signup** is enabled
3. Customize the email template if needed (optional)

### Step 4: Configure Email Template (Optional)

You can customize the confirmation email template to include your branding:

1. Go to: **Authentication** → **Email Templates** → **Confirm signup**
2. Update the template with your branding
3. Make sure the confirmation link uses: `{{ .ConfirmationURL }}`

### Step 5: Verify Environment Variables

Ensure the following environment variables are set in Vercel Production:

```bash
NEXT_PUBLIC_APP_URL=https://bluesminds.com
NEXT_PUBLIC_SUPABASE_URL=https://eoxoiqeswazggavqnocx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

**Check current variables:**
```bash
vercel env ls
```

**Update NEXT_PUBLIC_APP_URL if needed:**
```bash
vercel env rm NEXT_PUBLIC_APP_URL production --yes
vercel env add NEXT_PUBLIC_APP_URL production
# When prompted, enter: https://bluesminds.com
```

## How It Works Now

### Signup Flow

1. **User signs up** → API creates auth user with `emailRedirectTo: https://bluesminds.com/api/auth/callback`
2. **Supabase sends confirmation email** with link to your production domain
3. **User clicks email link** → Redirected to `/api/auth/callback`
4. **Callback handler**:
   - Verifies email is confirmed
   - Creates user profile in database
   - Redirects to dashboard
5. **User can now login** with verified email

### Login Flow

1. **User attempts login** → API checks credentials
2. **Email verification check**:
   - ✅ If verified → Login successful
   - ❌ If not verified → Error: "Please verify your email address. Check your inbox for a verification link."
3. **Account status check**:
   - ✅ If active → Access granted
   - ❌ If inactive/suspended → Error: "Account is [status]"

### Verification Messages

**Signup Success (Needs Verification):**
```
✅ Account created! Please check your email to verify your account.

Didn't receive the email? Check your spam folder or try logging in.
```

**Login Error (Not Verified):**
```
❌ Please verify your email address. Check your inbox for a verification link.
```

**Login Error (Invalid Credentials):**
```
❌ Invalid email or password
```

**Callback Error (Email Not Verified):**
```
❌ Please verify your email first
```

## Testing the Flow

### Test Email Verification

1. **Create a test account** at https://bluesminds.com/signup
2. **Check your email** for the confirmation link
3. **Click the confirmation link** → Should redirect to https://bluesminds.com/dashboard
4. **Try logging in** → Should succeed without errors

### Test Unverified Login

1. **Create an account** but don't click the email link
2. **Try logging in** → Should see: "Please verify your email address..."
3. **Check email and click link** → Now login should work

### Test Status Messages

1. **Login with wrong password** → Should see: "Invalid email or password"
2. **Login with unverified email** → Should see: "Please verify your email address..."
3. **Login with verified email** → Should redirect to dashboard

## Troubleshooting

### Issue: Still redirecting to localhost

**Solution:**
1. Check Supabase Site URL is set to `https://bluesminds.com`
2. Check Vercel `NEXT_PUBLIC_APP_URL` is set correctly
3. Redeploy the application: `vercel --prod`

### Issue: Email not sending

**Solution:**
1. Check Supabase email settings are enabled
2. Verify your email provider is configured in Supabase
3. Check spam folder for confirmation emails

### Issue: "Email not verified" error after clicking link

**Solution:**
1. Check callback route is working: `/api/auth/callback`
2. Verify redirect URLs are configured in Supabase
3. Check browser console for any JavaScript errors

## Files Modified

### Backend (API Routes)
- ✅ `app/api/auth/signup/route.ts` - Added email redirect URL and verification status
- ✅ `app/api/auth/login/route.ts` - Added email verification check
- ✅ `app/api/auth/callback/route.ts` - Enhanced to create profiles for verified users

### Frontend (Pages)
- ✅ `app/signup/page.tsx` - Added success message and verification UI
- ✅ `app/login/page.tsx` - Added error message handling from URL params

## Next Steps

1. ✅ Complete Supabase configuration (Steps 1-4 above)
2. ✅ Verify environment variables in Vercel
3. ✅ Deploy the updated code: `git push origin main`
4. ✅ Test the complete flow end-to-end
5. ✅ Monitor logs for any issues

## Support

If you encounter any issues:
1. Check Vercel deployment logs: `vercel logs --follow`
2. Check Supabase logs in the dashboard
3. Verify all configuration steps are completed
