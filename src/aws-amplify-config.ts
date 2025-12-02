// src/aws-amplify-config.ts
import { Amplify } from 'aws-amplify';

// Cognito configuration from environment variables
const COGNITO_USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID || 'sa-east-1_AQwN1JaVZ';
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '58vhdo6p4bnipujsk2p2pdqsq';
const COGNITO_REGION = import.meta.env.VITE_COGNITO_REGION || 'sa-east-1';

export function configureAmplify() {
  try {
    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId: COGNITO_USER_POOL_ID,
          userPoolClientId: COGNITO_CLIENT_ID,
          region: COGNITO_REGION,
        },
      },
    });
  } catch (error) {
    console.error('Error configuring Amplify:', error);
  }
}

