// Modified from BearStudio/start-ui-web: the email one-time code settings
// went with that sign-in method; BuildBase's hosted page replaces it.
import { envClient } from '@/env/client';

export const AUTH_SIGNUP_ENABLED = envClient.VITE_IS_DEMO ? false : true;
