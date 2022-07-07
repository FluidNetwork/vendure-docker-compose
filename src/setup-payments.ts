/* eslint-disable @typescript-eslint/no-var-requires */
import { SimpleGraphQLClient } from '@vendure/testing';
import { molliePaymentHandler } from '@vendure/payments-plugin/package/mollie/mollie.handler';
import { coinbaseHandler } from 'vendure-plugin-coinbase/dist/coinbase.handler';

// tslint:disable:no-console

import gql from 'graphql-tag';
import { VendureConfig } from '@vendure/core';
import { CreatePaymentMethod, PaymentMethods } from './generated-admin-types';

export const PAYMENT_METHOD_FRAGMENT = gql`
    fragment PaymentMethod on PaymentMethod {
        id
        code
        name
        description
        enabled
        checker {
            code
            args {
                name
                value
            }
        }
        handler {
            code
            args {
                name
                value
            }
        }
    }
`;

export const CREATE_PAYMENT_METHOD = gql`
    mutation CreatePaymentMethod($input: CreatePaymentMethodInput!) {
        createPaymentMethod(input: $input) {
            ...PaymentMethod
        }
    }
    ${PAYMENT_METHOD_FRAGMENT}
`;

export const PAYMENT_METHODS = gql`
    query PaymentMethods {
        paymentMethods {
            items {
                ...PaymentMethod
            }
            totalItems
        }
    }
    ${PAYMENT_METHOD_FRAGMENT}
`;

async function hasExistingPaymentMethod(adminClient: SimpleGraphQLClient, code: String) {
    const { paymentMethods } = await adminClient.query<PaymentMethods.Query>(PAYMENT_METHODS);
    return paymentMethods.items.some(p => p.handler.code == code);
}

async function getAdminClient(config: Required<VendureConfig>) {
    const apiUri = `http://${process.env.HOSTNAME}:${config.apiOptions.port}/${config.apiOptions.adminApiPath}`

    const adminClient = new SimpleGraphQLClient(config, apiUri)
    await adminClient.asSuperAdmin();

    return adminClient
}

export async function setupMollie(config: Required<VendureConfig>) {
    const adminClient = await getAdminClient(config)

    if (await hasExistingPaymentMethod(adminClient, 'mollie-payment-handler')) {
        console.log("found existing Mollie payment handler, skipping setup.")
        return
    }

    const { createPaymentMethod } = await adminClient.query<
        CreatePaymentMethod.Mutation,
        CreatePaymentMethod.Variables>(CREATE_PAYMENT_METHOD, {
            input: {
                code: `mollie-payment`,
                name: 'Mollie payment',
                description: 'This is a Mollie payment method',
                enabled: true,
                handler: {
                    code: molliePaymentHandler.code,
                    arguments: [
                        { name: 'redirectUrl', value: `https://${process.env.HOSTNAME!}:${config.apiOptions.port}` },
                        { name: 'apiKey', value: process.env.MOLLIE_API_KEY! },
                    ],
                },
            },
        });
}

export async function setupCoinbase(config: Required<VendureConfig>) {
    const adminClient = await getAdminClient(config)

    if (await hasExistingPaymentMethod(adminClient, 'coinbase-payment-handler')) {
        console.log("found existing Coinbase payment handler, skipping setup.")
        return
    }

    const { createPaymentMethod } = await adminClient.query<
        CreatePaymentMethod.Mutation,
        CreatePaymentMethod.Variables>(CREATE_PAYMENT_METHOD, {
            input: {
                code: `coinbase-payment`,
                name: 'Coinbase payment',
                description: 'This is a Coinbase payment method',
                enabled: true,
                handler: {
                    code: coinbaseHandler.code,
                    arguments: [
                        { name: 'redirectUrl', value: `https://${process.env.HOSTNAME!}:${config.apiOptions.port}` },
                        { name: 'apiKey', value: process.env.COINBASE_API_KEY! },
                    ],
                },
            },
        });
}