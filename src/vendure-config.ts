import { DefaultJobQueuePlugin, DefaultSearchPlugin, dummyPaymentHandler, VendureConfig, } from '@vendure/core';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import { defaultEmailHandlers, EmailPlugin } from '@vendure/email-plugin';
import { ConnectionOptions } from 'typeorm/connection/ConnectionOptions';
import path from 'path';
import {
    DEFAULT_AUTH_TOKEN_HEADER_KEY,
    SUPER_ADMIN_USER_IDENTIFIER,
    SUPER_ADMIN_USER_PASSWORD,
} from '@vendure/common/lib/shared-constants';
const hostname = process.env.HOSTNAME || 'localhost'
const isProduction = process.env.NODE_ENV == 'production'

function getDbOptions(): ConnectionOptions {
    switch(process.env.DATABASE || 'postgres') {
    default:
    case 'postgres':
        return {
            type: 'postgres',
            synchronize: false, // turn this off for production
            logging: false,
            database: 'vendure',
            host: process.env.DATABASE_HOST || 'localhost',
            port: Number(process.env.DATABASE_PORT) || 5432,
            username: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || 'password',
        }
    case 'sqlite':
        return {
            type: 'sqlite',
            synchronize: false, // turn this off for production
            logging: false,
            database: 'vendure',
        }
    }
}

function getPlaygroundApiOptions() {
    if (isProduction)
        return false
    
    return {
        settings: {
            'request.credentials': 'include',
        } as any,
    };
}

export const config: VendureConfig = {
    apiOptions: {
        hostname: '0.0.0.0',
        port: 3000,
        adminApiPath: 'admin-api',
        adminApiPlayground: getPlaygroundApiOptions(),
        adminApiDebug: !isProduction,
        shopApiPath: 'shop-api',
        shopApiPlayground: getPlaygroundApiOptions(),
        shopApiDebug: !isProduction,
    },
    authOptions: {
        superadminCredentials: {
            identifier: process.env.SUPER_ADMIN_USER_IDENTIFIER || SUPER_ADMIN_USER_IDENTIFIER,
            password: process.env.SUPER_ADMIN_USER_PASSWORD || SUPER_ADMIN_USER_PASSWORD,
        },
        requireVerification: true,
        cookieOptions: {
            secret: process.env.COOKIE_SECRET || '3r8wq8jdo92',
        },
        tokenMethod: ['cookie', 'bearer'],
        authTokenHeaderKey: DEFAULT_AUTH_TOKEN_HEADER_KEY
    },
    dbConnectionOptions: { 
        ...getDbOptions(), 
        migrations: [path.join(__dirname, '../migrations/*.ts')],
    },
    paymentOptions: {
        paymentMethodHandlers: [dummyPaymentHandler],
    },
    customFields: {},
    plugins: [
        AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: path.join(__dirname, '../static/assets'),
            assetUrlPrefix: `http://${hostname}:3000/assets/`,
        }),
        DefaultJobQueuePlugin,
        DefaultSearchPlugin,
        AdminUiPlugin.init({
            route: 'admin',
            port: 3002,
        }),
        EmailPlugin.init({
            route: 'mailbox',
            devMode: true,
            outputPath: path.join(__dirname, '../static/email/test-emails'),
            handlers: defaultEmailHandlers,
            templatePath: path.join(__dirname, '../static/email/templates'),
            globalTemplateVars: {
                // The following variables will change depending on your storefront implementation
                fromAddress: process.env.EMAIL || '"example" <noreply@example.com>',
                verifyEmailAddressUrl: `http://${hostname}:8080/verify`,
                passwordResetUrl: `http://${hostname}:8080/password-reset`,
                changeEmailAddressUrl: `http://${hostname}:8080/verify-email-address-change`
            },
        }),
    ],
};

