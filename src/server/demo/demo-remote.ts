/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only';
import { isoDateInZone } from '@/server/time';
import { env } from '@/server/config/env';

/**
 * DEMO MODE — a self-contained stand-in for the remote payments API, switched on with
 * DEMO_MODE=true. Nothing leaves this machine: every `remotePost` / `externalPost` is answered
 * from the in-memory data below, in the remote's own wire format, so every page, mapper and
 * service runs unchanged. State lives for the life of the server process (restart = fresh data).
 *
 * It starts EMPTY: one account (login ID and password 9902820080, an Admin with a ₹0 wallet) and no\n * customers, transactions, gateways, announcements or balances. Everything else is created in the\n * app. Any customer the admin adds can sign in with their mobile number as both login ID and\n * password once a wallet is added for them; every wallet PIN is 1234.
 */

type Row = Record<string, any>;
interface Reply {
  ok: boolean;
  statusCode: number;
  message: string;
  data: any;
}

const ok = (data: any = null, message = 'Success'): Reply => ({ ok: true, statusCode: 200, message, data });
const fail = (message: string, statusCode = 400): Reply => ({ ok: false, statusCode, message, data: null });

const PIN = '1234';

// ── time helpers (zone-local strings with no offset, as the remote writes them) ──
function localStamp(at: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: env().APP_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(at);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}:${g('second')}`;
}
const nowStamp = () => localStamp(new Date());
const inRange = (stamp: string, from?: string, to?: string) => {
  const d = String(stamp).slice(0, 10);
  return (!from || d >= String(from).slice(0, 10)) && (!to || d <= String(to).slice(0, 10));
};

// ── the store ──
interface Store {
  seq: number;
  customers: Row[];
  wallets: Row[];
  ledger: Row[];
  imps: Row[];
  pg: Row[];
  bills: Row[];
  qrReq: Row[];
  qrCodes: Row[];
  announcements: Row[];
  senders: Row[];
  accounts: Row[];
  mappings: Row[];
  groups: Row[];
  categories: Row[];
  gateways: Row[];
}

const g = globalThis as unknown as { __pe6DemoStore?: Store };

function build(): Store {
  const s: Store = {
    seq: 1000, customers: [], wallets: [], ledger: [], imps: [], pg: [], bills: [], qrReq: [], qrCodes: [],
    announcements: [], senders: [], accounts: [], mappings: [], groups: [], categories: [], gateways: [],
  };
  // Nothing is pre-filled: one sign-in account, an empty wallet, and a clean slate for everything
  // else. Customers, PG setup, announcements, QR codes, senders and bank accounts are all created
  // from the app, by the admin and the people they add.
  s.customers.push({
    Id: 101, Client_ID: env().MASTER_CLIENT_ID, FULL_NAME: 'PE6 Admin', PAN: '', ADHAAR: '', DATE_OF_BIRTH: '', RESIDENTIAL_ADDRESS: '',
    STORE_NAME: 'PE6 Payments', STORE_ADDRESS: '', GST: '', MOBILE_NUMBER: '9902820080', EMAIL_ID: '', username: '9902820080', isActive: true,
    roleId: 1, roleName: 'Admin',
  });
  s.wallets.push({ Id: 501, customerId: 101, currentBalance: 0, payoutCharges: 0, isActive: true, username: '9902820080', Password: '9902820080', Passpin: PIN });  return s;
}

function store(): Store {
  return (g.__pe6DemoStore ??= build());
}

// ── primitives that move money ──
function ledgerEntry(s: Store, walletId: number, e: Row, at = nowStamp()): Row {
  const w = s.wallets.find((x) => x.Id === walletId);
  if (!w) throw new Error(`demo: unknown wallet ${walletId}`);
  const debit = Number(e.debit ?? 0);
  const credit = Number(e.credit ?? 0);
  w.currentBalance = Math.round((Number(w.currentBalance) - debit + credit) * 100) / 100;
  const row = {
    Id: ++s.seq, walletId, createdTime: at, txnType: e.txnType ?? (credit ? 'CREDIT' : 'DEBIT'), channel: e.channel ?? 'WALLET', status: e.status ?? 'SUCCESS',
    remarks: e.remarks ?? '', utr: e.utr ?? null, senderName: e.senderName ?? null, senderMobile: e.senderMobile ?? null,
    accountHolderName: e.accountHolderName ?? null, accountNumber: e.accountNumber ?? null, ifsc: e.ifsc ?? null,
    debit, credit, charges: Number(e.charges ?? 0), balance: w.currentBalance,
  };
  s.ledger.push(row);
  return row;
}

const utr = (s: Store) => String(400000000000 + ++s.seq * 7919).slice(0, 12);
const refNo = (s: Store) => `PE6${new Date().getFullYear()}${String(++s.seq).padStart(7, '0')}`;

function chargeFor(st: Row, amount: number): number {
  const raw = st.chargeType === 'VALUE' ? Number(st.chargeValue) : (amount * Number(st.chargeValue)) / 100;
  return Math.round(Math.max(raw, Number(st.minCharge ?? 0)) * 100) / 100;
}

function recordPg(s: Store, w: Row, owner: Row, gw: Row, st: Row, amount: number, payer: string, last4: string, status: string, at: string, ref = refNo(s)): Row {
  const charges = chargeFor(st, amount);
  const partner = Math.round(chargeFor({ ...st, chargeType: st.partnerChargeType, chargeValue: st.partnerChargeValue, minCharge: st.partnerMinCharge }, amount) * 100) / 100;
  const row: Row = {
    Id: ++s.seq, createdTime: at, walletId: w.Id, username: owner.username, retailerName: owner.FULL_NAME, customerName: owner.FULL_NAME, MOBILE_NUMBER: owner.MOBILE_NUMBER,
    payerName: payer, cardNumber: `XXXXXXXXXXXX${last4}`, pgCode: st.pgKey, pgName: gw.pgName, settlementName: st.settlementName,
    amount, charges, partnerCharges: partner, profit: Math.round((charges - partner) * 100) / 100, status, pipeRefNumber: ref, walletCreditedTime: null, walletClosingBalance: null,
  };
  if (status === 'SUCCESS') settlePg(s, row);
  s.pg.push(row);
  return row;
}

/** Credits the wallet for a successful link: amount less our charge. */
function settlePg(s: Store, row: Row) {
  row.status = 'SUCCESS';
  const entry = ledgerEntry(s, row.walletId, { txnType: 'CREDIT', channel: 'PG', remarks: `Card payment ${row.pipeRefNumber}`, credit: row.amount - row.charges, charges: row.charges, utr: row.pipeRefNumber }, row.createdTime);
  row.walletCreditedTime = entry.createdTime;
  row.walletClosingBalance = entry.balance;
}

function recordImps(s: Store, w: Row, amount: number, status: string, at: string, acct?: Row, sender?: Row): Row {
  const a = acct ?? s.accounts[Math.floor(amount / 10) % s.accounts.length];
  const snd = sender ?? s.senders[0];
  const row: Row = {
    Id: ++s.seq, createdTime: at, walletId: w.Id, amount, utr: status === 'SUCCESS' ? utr(s) : null, status, accountHolderName: a.AccountHolderName,
    accountNumber: a.AccountNumber, ifsc: a.IFSC, senderName: snd.SenderName, senderMobile: snd.mobileNumber, customerName: null,
  };
  const charges = Number(w.payoutCharges);
  ledgerEntry(s, w.Id, { txnType: 'DEBIT', channel: 'IMPS', status, remarks: `IMPS to ${a.AccountHolderName}`, debit: amount + charges, charges, utr: row.utr, senderName: snd.SenderName, senderMobile: snd.mobileNumber, accountHolderName: a.AccountHolderName, accountNumber: a.AccountNumber, ifsc: a.IFSC }, at);
  if (status === 'FAILED') ledgerEntry(s, w.Id, { txnType: 'CREDIT', channel: 'IMPS', remarks: 'Refund — transfer failed', credit: amount + charges }, at);
  s.imps.push(row);
  return row;
}

function recordBill(s: Store, w: Row, amount: number, status: string, at: string, consumer = 'Rohit Sharma', last4 = '4321'): Row {
  const owner = s.customers.find((c) => c.Id === w.customerId)!;
  const charges = 15;
  const entry = ledgerEntry(s, w.Id, { txnType: 'DEBIT', channel: 'BBPS', remarks: `Credit card bill ${consumer}`, debit: amount + charges, charges }, at);
  const row: Row = {
    Id: ++s.seq, createdTime: at, walletId: w.Id, txntype: 'CREDIT CARD', Amount: amount, charges, closingbalance: entry.balance, npciRef: `NP${utr(s)}`,
    status, ConsumerName: consumer, cardNumber: `XXXXXXXXXXXX${last4}`, retailerName: owner.FULL_NAME, MOBILE_NUMBER: owner.MOBILE_NUMBER,
  };
  s.bills.push(row);
  return row;
}

const walletOf = (s: Store, id: unknown) => s.wallets.find((w) => w.Id === Number(id));
const customerOf = (s: Store, id: unknown) => s.customers.find((c) => c.Id === Number(id));
const syncBalances = (s: Store) => s.customers.forEach((c) => { c.lastBalance = s.wallets.find((w) => w.customerId === c.Id)?.currentBalance ?? 0; });
const forWallet = (rows: Row[], walletId: unknown) => (Number(walletId) ? rows.filter((r) => r.walletId === Number(walletId)) : rows);
const byDate = (rows: Row[], b: Row, key = 'createdTime') => rows.filter((r) => inRange(r[key], b.fromDate, b.toDate));
const newestFirst = (rows: Row[]) => [...rows].sort((a, b) => String(b.createdTime).localeCompare(String(a.createdTime)));
const sum = (rows: Row[], key: string) => rows.reduce((t, r) => t + Number(r[key] ?? 0), 0);

// ── the router ──
export function demoRemote(path: string, body: Row = {}): Reply {
  const s = store();
  const p = path.replace(/^\//, '').toLowerCase();
  const b = body;

  switch (p) {
    // auth & wallets
    case 'wallet/login': {
      const username = String(b.username ?? '').trim();
      const c = s.customers.find((x) => x.username === username);
      const w = c && s.wallets.find((x) => x.customerId === c.Id);
      if (!c || !w || String(b.password) !== w.Password) return fail('Invalid username, password ');
      return ok([{ customerId: c.Id, walletId: w.Id, lastBalance: w.currentBalance, payoutCharges: w.payoutCharges, roleName: c.roleName, roleId: c.roleId, FULL_NAME: c.FULL_NAME, STORE_NAME: c.STORE_NAME, MOBILE_NUMBER: c.MOBILE_NUMBER, EMAIL_ID: c.EMAIL_ID, username: c.username }]);
    }
    case 'wallet/selectbycustomerid': {
      const w = s.wallets.find((x) => x.customerId === Number(b.customerId));
      return w ? ok([w]) : fail('No wallet found');
    }
    case 'wallet/add': {
      const c = customerOf(s, b.customerId);
      if (!c) return fail('Customer not found');
      if (s.wallets.some((w) => w.customerId === c.Id)) return fail('Wallet already exists');
      c.username = c.MOBILE_NUMBER;
      s.wallets.push({ Id: ++s.seq, customerId: c.Id, currentBalance: 0, payoutCharges: 5, isActive: true, username: c.MOBILE_NUMBER, Password: c.MOBILE_NUMBER, Passpin: PIN });
      return ok(1, 'Wallet added');
    }
    case 'wallet/updatepayoutcharges': {
      const w = walletOf(s, b.walletId);
      if (!w) return fail('Wallet not found');
      w.payoutCharges = Number(b.payoutCharges);
      return ok(1);
    }
    case 'wallet/credit': {
      const w = walletOf(s, b.walletId);
      if (!w) return fail('Wallet not found');
      ledgerEntry(s, w.Id, { txnType: 'CREDIT', channel: 'WALLET', remarks: b.remarks ?? 'Manual topup', credit: Number(b.amount) });
      return ok(1, 'Credited');
    }
    case 'wallet/transfer': {
      const from = walletOf(s, b.fromWalletId);
      const to = walletOf(s, b.toWalletId);
      if (!from || !to) return fail('Wallet not found');
      const amt = Number(b.amount);
      if (amt > from.currentBalance) return fail('Insufficient balance');
      ledgerEntry(s, from.Id, { txnType: 'DEBIT', channel: 'TRANSFER', remarks: `Wallet transfer to ${to.Id}`, debit: amt });
      ledgerEntry(s, to.Id, { txnType: 'CREDIT', channel: 'TRANSFER', remarks: `Wallet transfer from ${from.Id}`, credit: amt });
      return ok(++s.seq);
    }
    case 'wallet/changepasswordpin': {
      const w = walletOf(s, b.walletId);
      if (!w) return fail('Wallet not found');
      if (String(b.oldPassword) !== w.Password || String(b.oldPasspin) !== w.Passpin) return fail('The current password or PIN is wrong.');
      w.Password = String(b.newPassword);
      w.Passpin = String(b.newPasspin);
      const c = customerOf(s, w.customerId);
      if (c) c.username = c.username; // login ID unchanged
      return ok(1, 'Updated');
    }
    case 'admin/wallet/resetpassword': {
      const w = walletOf(s, b.walletId);
      if (!w) return fail('Wallet not found');
      if (b.Password) w.Password = String(b.Password);
      if (b.Passpin) w.Passpin = String(b.Passpin);
      return ok(1);
    }
    case 'admin/wallet/pullback': {
      const from = walletOf(s, b.walletId);
      const to = walletOf(s, b.adminWalletId);
      const amt = Number(b.amount);
      if (!from || !to) return fail('Wallet not found');
      if (amt > from.currentBalance) return fail('The wallet does not have that much balance.');
      ledgerEntry(s, from.Id, { txnType: 'DEBIT', channel: 'PULLBACK', remarks: b.remarks ?? 'Admin pullback', debit: amt });
      ledgerEntry(s, to.Id, { txnType: 'CREDIT', channel: 'PULLBACK', remarks: `Pullback from wallet ${from.Id}`, credit: amt });
      return ok(1, 'Pullback successful');
    }
    case 'wallet/ledger': {
      const rows = byDate(forWallet(s.ledger, b.walletId), b);
      return ok(newestFirst(rows));
    }

    // customers
    case 'customer/selectbyclientid':
      syncBalances(s);
      return ok(s.customers);
    case 'customer/selectbyid': {
      syncBalances(s);
      const c = customerOf(s, b.id);
      return c ? ok([c]) : ok([]);
    }
    case 'customer/insert': {
      const c: Row = { ...b, Id: ++s.seq, Client_ID: Number(b.Client_ID), username: null, isActive: true, roleId: null, roleName: '' };
      delete c.id;
      s.customers.push(c);
      return ok(c.Id);
    }
    case 'customer/update': {
      const c = customerOf(s, b.id);
      if (!c) return fail('Customer not found');
      for (const k of ['PAN', 'ADHAAR', 'FULL_NAME', 'DATE_OF_BIRTH', 'RESIDENTIAL_ADDRESS', 'STORE_NAME', 'STORE_ADDRESS', 'GST', 'MOBILE_NUMBER', 'EMAIL_ID']) c[k] = b[k] ?? c[k];
      return ok(1);
    }
    case 'customer/delete': {
      const i = s.customers.findIndex((x) => x.Id === Number(b.id));
      if (i >= 0) {
        s.wallets = s.wallets.filter((w) => w.customerId !== s.customers[i].Id);
        s.customers.splice(i, 1);
      }
      return fail('Deleted'); // the remote's status is unreliable here; callers re-read
    }
    case 'customer/assignrole': {
      const c = customerOf(s, b.id);
      const role = ROLES.find((r) => r.Id === Number(b.roleId));
      if (c && role) { c.roleId = role.Id; c.roleName = role.RoleName; }
      return ok(1);
    }
    case 'role/select':
      return ok(ROLES);
    case 'client/selectbyid':
      return ok([{ Id: env().MASTER_CLIENT_ID, ClientName: 'PE6 Payments', ClientCity: null, FirmName: 'PE6 Payments' }]);

    // IMPS
    case 'sender/selectbymobileandclientid': {
      const x = s.senders.find((r) => r.mobileNumber === String(b.mobileNumber));
      return x ? ok([x]) : fail('Sender not found');
    }
    case 'sender/insert': {
      if (!s.senders.some((r) => r.mobileNumber === String(b.mobileNumber))) {
        s.senders.push({ Id: ++s.seq, mobileNumber: b.mobileNumber, SenderName: b.SenderName, SenderAddress: b.SenderAddress ?? '', senderPan: b.senderPan ?? '', senderAadhaar: b.senderAadhaar ?? '' });
      }
      return ok(1);
    }
    case 'bank/select':
      return ok(BANKS);
    case 'bankaccount/selectbymobileandclientid': {
      const rows = s.accounts.filter((r) => r.mobileNumber === String(b.mobileNumber));
      return rows.length ? ok(rows) : fail('No accounts');
    }
    case 'bankaccount/insert': {
      if (!s.senders.some((r) => r.mobileNumber === String(b.mobileNumber))) return fail('Register the sender first.');
      s.accounts.push({ Id: ++s.seq, mobileNumber: b.mobileNumber, AccountHolderName: b.AccountHolderName, AccountNumber: b.AccountNumber, IFSC: b.IFSC, BankName: b.BankName, BankLogoUrl: null });
      return ok(1);
    }
    case 'bankaccount/verify':
      // No bank service is connected, so no account holder's name is ever made up.
      return fail('Bank verification is not connected.');
    case 'transaction/insert': {
      const w = walletOf(s, b.walletId);
      const acct = s.accounts.find((a) => a.Id === Number(b.bankAccountId));
      const snd = s.senders.find((x) => x.Id === Number(b.senderId));
      if (!w || !acct || !snd) return fail('Unknown wallet, sender or account.');
      if (String(b.passpin) !== w.Passpin) return fail('Invalid PIN.');
      const row = recordImps(s, w, Number(b.amount), 'SUCCESS', nowStamp(), acct, snd);
      return ok(row.Id, 'Transfer submitted');
    }
    case 'transaction/report':
      return ok(newestFirst(byDate(forWallet(s.imps, b.walletId), b)));
    case 'admin/impstransferreport':
      return ok(newestFirst(byDate(s.imps, b)));
    case 'transaction/refund': {
      const t = s.imps.find((x) => x.Id === Number(b.id));
      if (!t) return fail('Transaction not found');
      if (t.status === 'REFUNDED') return fail('Already refunded.');
      const w = walletOf(s, t.walletId)!;
      t.status = 'REFUNDED';
      ledgerEntry(s, w.Id, { txnType: 'CREDIT', channel: 'IMPS', remarks: b.remarks ?? 'Refund', credit: Number(t.amount) + Number(w.payoutCharges) });
      return ok(1, 'Refund successful');
    }

    // PG
    case 'pg/selectbywallet': {
      const rows: Row[] = [];
      for (const gw of s.gateways.filter((x) => x.isActive)) {
        const grp = s.groups.find((x) => x.Id === gw.groupId);
        const cat = s.categories.find((x) => x.Id === gw.categoryId);
        for (const st of gw.settlements.filter((x: Row) => x.isActive)) {
          rows.push({ groupId: grp?.Id ?? 0, groupName: grp?.groupName ?? '', settlementId: st.settlementId, settlementName: st.settlementName, settlementDays: st.settlementDays, pgKey: st.pgKey, chargeType: st.chargeType, chargeValue: st.chargeValue, minCharge: st.minCharge, maxLimit: 200000, categoryId: cat?.Id ?? 0, categoryName: cat?.categoryName ?? '', pgId: gw.PgId, pgName: gw.pgName, description: gw.description });
        }
      }
      return rows.length ? ok(rows) : fail('No PGs mapped');
    }
    case 'pg/generatelink': {
      const w = walletOf(s, b.walletId);
      const owner = w && customerOf(s, w.customerId);
      let gw: Row | undefined, st: Row | undefined;
      for (const x of s.gateways) { const f = x.settlements.find((y: Row) => y.pgKey === b.pgCode); if (f) { gw = x; st = f; } }
      if (!w || !owner || !gw || !st) return fail('Unknown gateway.');
      const ref = refNo(s);
      const row = recordPg(s, w, owner, gw, st, Number(b.amount), String(b.custName), String(b.card_last_4_digit), 'PENDING', nowStamp(), ref);
      return ok({ Id: row.Id, pgLink: b.redirectURL, refNo: ref, amount: row.amount, charges: row.charges, status: 'PENDING' }, 'Link generated');
    }
    case 'pg/checkstatus': {
      const row = s.pg.find((x) => String(x.pipeRefNumber).toLowerCase() === String(b.reference_id).toLowerCase());
      if (!row) return fail('Transaction not found in vendor');
      // The demo "payer" pays the moment the link is opened.
      if (row.status === 'PENDING') { row.createdTime = row.createdTime; settlePg(s, row); }
      return ok({ vendorStatus: row.status, utr: `U${row.pipeRefNumber}`, amount: row.amount, credited: row.status === 'SUCCESS', walletClosingBalance: row.walletClosingBalance });
    }
    case 'pg/transferreport':
      return ok(newestFirst(byDate(forWallet(s.pg, b.walletId), b)));
    case 'admin/pgtransferreport':
      return ok(newestFirst(byDate(s.pg, b)));

    // PG settings
    case 'pgsettings/group/selectall': return ok(s.groups);
    case 'pgsettings/group/insert': s.groups.push({ Id: ++s.seq, groupName: b.groupName, logoUrl: b.logoUrl ?? '', displayOrder: b.displayOrder, isActive: true, createdTime: nowStamp() }); return ok(1);
    case 'pgsettings/group/update': return patch(s.groups, 'Id', b, ['groupName', 'logoUrl', 'displayOrder', 'isActive']);
    case 'pgsettings/group/delete': s.groups = s.groups.filter((x) => x.Id !== Number(b.id)); return ok(1);
    case 'pgsettings/category/selectall': return ok(s.categories);
    case 'pgsettings/category/insert': s.categories.push({ Id: ++s.seq, categoryName: b.categoryName, displayOrder: b.displayOrder, isActive: true, createdTime: nowStamp() }); return ok(1);
    case 'pgsettings/category/update': return patch(s.categories, 'Id', b, ['categoryName', 'displayOrder', 'isActive']);
    case 'pgsettings/category/delete': s.categories = s.categories.filter((x) => x.Id !== Number(b.id)); return ok(1);
    case 'pgsettings/pg/selectall': return ok(s.gateways);
    case 'pgsettings/pg/insert': s.gateways.push({ PgId: ++s.seq, groupId: b.groupId, categoryId: b.categoryId, pgName: b.pgName, description: b.description ?? '', displayOrder: b.displayOrder, isActive: true, createdTime: nowStamp(), settlements: [] }); return ok(1);
    case 'pgsettings/pg/update': {
      const x = s.gateways.find((r) => r.PgId === Number(b.id));
      if (!x) return fail('Not found');
      Object.assign(x, { groupId: b.groupId, categoryId: b.categoryId, pgName: b.pgName, description: b.description ?? '', displayOrder: b.displayOrder, isActive: b.isActive });
      return ok(1);
    }
    case 'pgsettings/pg/delete': s.gateways = s.gateways.filter((x) => x.PgId !== Number(b.id)); return ok(1);
    case 'pgsettings/settlement/insert': {
      const x = s.gateways.find((r) => r.PgId === Number(b.pgId));
      if (!x) return fail('Gateway not found');
      const sid = ++s.seq;
      x.settlements.push({ settlementId: sid, settlementName: b.settlementName, settlementDays: b.settlementDays, pgKey: b.pgKey, partnerChargeType: b.partnerChargeType, partnerChargeValue: b.partnerChargeValue, partnerMinCharge: b.partnerMinCharge, isActive: true, chargeId: sid, chargeType: b.chargeType, chargeValue: b.chargeValue, minCharge: b.minCharge, chargeIsActive: true });
      return ok(1);
    }
    case 'pgsettings/settlement/update': {
      for (const x of s.gateways) {
        const st = x.settlements.find((y: Row) => y.settlementId === Number(b.id));
        if (st) Object.assign(st, { settlementName: b.settlementName, settlementDays: b.settlementDays, pgKey: b.pgKey, partnerChargeType: b.partnerChargeType, partnerChargeValue: b.partnerChargeValue, partnerMinCharge: b.partnerMinCharge, chargeType: b.chargeType, chargeValue: b.chargeValue, minCharge: b.minCharge, isActive: b.isActive, chargeIsActive: b.isActive });
      }
      return ok(1);
    }
    case 'pgsettings/settlement/delete': for (const x of s.gateways) x.settlements = x.settlements.filter((y: Row) => y.settlementId !== Number(b.id)); return ok(1);
    case 'pgsettings/walletmapping/synctoretailers': return ok(1, 'Applied to every retailer.');
    case 'pgsettings/walletmapping/applytowallet': return ok(1, 'Applied to that retailer.');

    // QR
    case 'qr/getnext': {
      const q = s.qrCodes.find((x) => x.status === 'Active');
      if (!q) return fail('No QR available or daily limit exhausted');
      const used = sum(s.qrReq.filter((r) => r.QrId === q.Id && String(r.createdTime).slice(0, 10) === isoDateInZone() && r.status !== 'REJECTED'), 'Amount');
      return ok([{ QrId: q.Id, Vpa: q.Vpa, QrName: q.QrName, ChargeType: q.ChargeType, ChargeValue: q.ChargeValue, MinCharge: q.MinCharge, DailyMaxLimit: q.DailyMaxLimit, RemainingToday: Math.max(0, q.DailyMaxLimit - used) }]);
    }
    case 'qr/selectall': return ok(s.qrCodes);
    case 'qr/insert': s.qrCodes.push({ Id: ++s.seq, QrName: b.QrName ?? b.qrName, Vpa: b.Vpa ?? b.vpa, ChargeType: b.ChargeType ?? b.chargeType, ChargeValue: b.ChargeValue ?? b.chargeValue, MinCharge: b.MinCharge ?? b.minCharge, DailyMaxLimit: b.DailyMaxLimit ?? b.dailyMaxLimit, DisplayOrder: b.DisplayOrder ?? b.displayOrder ?? 9, status: 'Active' }); return ok(1, 'QR code added.');
    case 'qr/request/insert': {
      const w = walletOf(s, b.walletId);
      const q = s.qrCodes.find((x) => x.Id === Number(b.qrId));
      if (!w || !q) return fail('Unknown wallet or QR.');
      const owner = customerOf(s, w.customerId)!;
      const amt = Number(b.amount);
      const charges = Math.round(Math.max(q.ChargeType === 'VALUE' ? q.ChargeValue : (amt * q.ChargeValue) / 100, q.MinCharge) * 100) / 100;
      s.qrReq.push({ Id: ++s.seq, createdTime: nowStamp(), walletId: w.Id, QrId: q.Id, QrName: q.QrName, Vpa: q.Vpa, Amount: amt, charges, creditAmount: amt - charges, UTR: b.utr, status: 'PENDING', approvedTime: null, walletClosingBalance: null, retailerName: owner.FULL_NAME, username: owner.username, remarks: b.remarks ?? null });
      return ok(1, 'Request created.');
    }
    case 'qr/request/report': return ok(newestFirst(forWallet(s.qrReq, b.walletId)));
    case 'qr/request/pending': return ok(newestFirst(s.qrReq.filter((r) => r.status === 'PENDING')));
    case 'qr/request/approve': {
      const r = s.qrReq.find((x) => x.Id === Number(b.id));
      if (!r || r.status !== 'PENDING') return fail('Request is not pending.');
      const e = ledgerEntry(s, r.walletId, { txnType: 'CREDIT', channel: 'QR', remarks: `QR collect ${r.UTR}`, credit: r.creditAmount, charges: r.charges, utr: r.UTR });
      Object.assign(r, { status: 'APPROVED', approvedTime: nowStamp(), walletClosingBalance: e.balance, remarks: 'Approved' });
      return ok(1, 'Approved.');
    }
    case 'qr/request/reject': {
      const r = s.qrReq.find((x) => x.Id === Number(b.id));
      if (!r || r.status !== 'PENDING') return fail('Request is not pending.');
      Object.assign(r, { status: 'REJECTED', remarks: b.remarks ?? 'Rejected' });
      return ok(1, 'Rejected.');
    }

    // dashboard & admin
    case 'dashboard/get': {
      // There is no real payment pipe here, so the "pipe" simply mirrors the wallets: nothing invented, no difference.
      const wallets = sum(s.wallets, 'currentBalance');
      return ok({ pipeBalances: [], totalPipeBalance: wallets, totalWalletBalance: wallets, walletCount: s.wallets.length, difference: 0 });
    }
    case 'dashboard/log': {
      const wallets = sum(s.wallets, 'currentBalance');
      const today = isoDateInZone();
      const rows: Row[] = inRange(today, b.fromDate, b.toDate)
        ? [{ Id: ++s.seq, createdTime: nowStamp(), pipeName: 'Wallets', pipeBalance: wallets, totalWalletBalance: wallets, walletCount: s.wallets.length, difference: 0, pipeStatus: 'OK', pipeMessage: '' }]
        : [];
      return ok(rows);
    }
    case 'dashboard/explain': {
      const today = isoDateInZone();
      const t = (rows: Row[], key = 'amount', status?: string) => sum(rows.filter((r) => String(r.createdTime).slice(0, 10) === today && (!status || r.status === status)), key);
      const wallets = sum(s.wallets, 'currentBalance');
      return { ok: true, statusCode: 200, message: 'Success', data: { walletCount: s.wallets.length, walletBalance: wallets, pipeBalance: wallets, difference: 0, today: { pgCredit: t(s.pg, 'amount', 'SUCCESS'), impsSuccess: t(s.imps, 'amount', 'SUCCESS'), impsFailed: t(s.imps, 'amount', 'FAILED'), impsRefund: t(s.imps, 'amount', 'REFUNDED'), impsPending: t(s.imps, 'amount', 'PENDING'), bbpsSuccess: t(s.bills, 'Amount', 'SUCCESS'), bbpsFailed: 0, bbpsRefund: 0, verifyDebit: 0 } } };
    }    case 'dashboard/customerbusiness': {
      const rows: Row[] = [];
      for (const w of s.wallets) {
        const owner = customerOf(s, w.customerId)!;
        if (owner.roleName !== 'Retailer') continue;
        for (let d = 0; d < 30; d++) {
          const day = isoDateInZone(-d);
          if (!inRange(day, b.fromDate, b.toDate)) continue;
          const on = (r: Row) => r.walletId === w.Id && String(r.createdTime).slice(0, 10) === day && r.status === 'SUCCESS';
          const pg = s.pg.filter(on), im = s.imps.filter(on), bl = s.bills.filter(on);
          if (!pg.length && !im.length && !bl.length) continue;
          rows.push({ customerName: owner.FULL_NAME, storeName: owner.STORE_NAME, MOBILE_NUMBER: owner.MOBILE_NUMBER, walletId: w.Id, businessDate: day, pgAmount: sum(pg, 'amount'), pgCount: pg.length, impsAmount: sum(im, 'amount'), impsCount: im.length, bbpsAmount: sum(bl, 'Amount'), bbpsCount: bl.length });
        }
      }
      return ok(rows);
    }
    case 'announcement/select': return ok(s.announcements);
    case 'announcement/insert': s.announcements.push({ Id: ++s.seq, title: b.title, message: b.message, isActive: b.isActive !== false, createdTime: nowStamp(), updatedTime: null }); return ok(1, 'Announcement published.');
    case 'announcement/update': {
      const a = s.announcements.find((x) => x.Id === Number(b.id));
      if (!a) return fail('Not found');
      Object.assign(a, { title: b.title ?? a.title, message: b.message ?? a.message, isActive: b.isActive ?? a.isActive, updatedTime: nowStamp() });
      return ok(1, 'Announcement updated.');
    }

    // distributor
    case 'distributor/mapping/selectretailers': {
      const rows = s.mappings.filter((m) => m.distributorWalletId === Number(b.distributorWalletId)).map((m) => {
        const w = walletOf(s, m.retailerWalletId)!;
        const c = customerOf(s, w.customerId)!;
        return { Id: m.Id, retailerWalletId: m.retailerWalletId, distributorWalletId: m.distributorWalletId, pgCommissionPercent: m.pgCommissionPercent, FULL_NAME: c.FULL_NAME, MOBILE_NUMBER: c.MOBILE_NUMBER, STORE_NAME: c.STORE_NAME, username: c.username, currentBalance: w.currentBalance };
      });
      return ok(rows);
    }
    case 'distributor/mapping/save':
      s.mappings.push({ Id: ++s.seq, retailerWalletId: Number(b.retailerWalletId), distributorWalletId: Number(b.distributorWalletId), pgCommissionPercent: Number(b.pgCommissionPercent) });
      return ok(1, 'Retailer mapped.');

    // card bills
    case 'bbps/creditcard/pay': {
      const w = walletOf(s, b.walletId);
      if (!w) return fail('Wallet not found');
      const amt = Number(b.amount);
      if (amt + 15 > w.currentBalance) return fail('Insufficient balance.');
      recordBill(s, w, amt, 'SUCCESS', nowStamp(), String(b.customerName || 'Cardholder'), String(b.cardNumber).slice(-4));
      return ok(1, 'Payment successful.');
    }
    case 'bbps/creditcard/report': {
      let rows = byDate(forWallet(s.bills, b.walletId), b);
      if (b.status) rows = rows.filter((r) => r.status === String(b.status).toUpperCase());
      return ok(newestFirst(rows));
    }

    default:
      return ok([], 'Demo mode: no sample data for this call.');
  }
}

function patch(rows: Row[], key: string, b: Row, keys: string[]): Reply {
  const x = rows.find((r) => r[key] === Number(b.id));
  if (!x) return fail('Not found');
  for (const k of keys) if (b[k] !== undefined) x[k] = b[k];
  return ok(1);
}

const ROLES = [
  { Id: 1, RoleName: 'Admin' },
  { Id: 2, RoleName: 'Distributor' },
  { Id: 3, RoleName: 'Retailer' },
];

/** No bank directory is invented here: an empty list, until a real one is connected. */
const BANKS: Row[] = [];

// ── the BBPS bill service (an external API in production) ──
/** No billers are invented here either. */
const BILLERS: string[][] = [];

export function demoExternal(url: string, body: any): { ok: true; httpStatus: number; json: unknown } {
  if (!/fetch/i.test(url)) {
    const data = BILLERS.map(([billerId, billerName]) => ({
      category: 'CREDIT CARD', billerId, billerName,
      customerparams: [
        { paramName: 'Last 4 digits of Credit Card Number', dataType: 'NUMERIC', optional: false, values: [] },
        { paramName: 'Registered Mobile Number', dataType: 'NUMERIC', optional: false, values: [] },
      ],
    }));
    return { ok: true, httpStatus: 200, json: { status: true, message: 'Success', data } };
  }
  // No bill is ever invented: with no biller service connected there is nothing to fetch.
  void body;
  return { ok: true, httpStatus: 200, json: { status: false, message: 'No biller service is connected, so no bill can be fetched.', data: null } };
}
