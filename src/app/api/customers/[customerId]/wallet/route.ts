import { adminRoute, positiveId } from '@/server/http/route';
import { getOwnedWallet, provisionWallet } from '@/server/services/wallet.service';

export const GET = adminRoute(async ({ params }) => getOwnedWallet(positiveId(params.customerId, 'customer')));

/** Provisions a wallet for a customer who has none yet. */
export const POST = adminRoute(async ({ params }) => provisionWallet(positiveId(params.customerId, 'customer')));
