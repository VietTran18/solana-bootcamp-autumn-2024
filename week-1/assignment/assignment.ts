import {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction,
    SYSVAR_RENT_PUBKEY
} from "@solana/web3.js";

import { payer, connection } from "../code/lib/vars"
import { explorerURL, printConsoleSeparator } from "../code/lib/helpers";

const DESTINATION_ACCOUNT_PUBLIC_KEY = new PublicKey('63EEC9FfGyksm7PkVC6z8uAmqozbQcTzbkWJNsgqjkFs');

(async () => {
    try {
        console.log("Payer address:", payer.publicKey.toBase58());

        // Tạo một tài khoản tạm thời mới cho mỗi giao dịch
        const tempAccount = Keypair.generate();
        console.log("Temporary account public key:", tempAccount.publicKey.toBase58());

        // Tính toán số lamport cần thiết cho tài khoản tạm thời
        const space = 0; // Không cần space vì chúng ta chỉ sử dụng tài khoản này để chuyển tiền
        const rentExemptionAmount = await connection.getMinimumBalanceForRentExemption(space);
        const transferAmount = 0.2 * LAMPORTS_PER_SOL;
        const totalAmount = rentExemptionAmount + transferAmount;

        //  const feePayerAirdropSignature = await connection.requestAirdrop(
        //     tempAccount.publicKey,
        //   LAMPORTS_PER_SOL
        // );
        // await connection.confirmTransaction(feePayerAirdropSignature);

        // Tạo tài khoản tạm thời và chuyển SOL vào đó
        const createTempAccountIx = SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: tempAccount.publicKey,
            lamports: totalAmount,
            space: space,
            programId: SystemProgram.programId
        });

        // Chuyển SOL từ tài khoản tạm thời đến tài khoản đích
        const transferToDestinationIx = SystemProgram.transfer({
            fromPubkey: tempAccount.publicKey,
            toPubkey: DESTINATION_ACCOUNT_PUBLIC_KEY,
            lamports: transferAmount,
        });
        const closeAccountIx = SystemProgram.transfer({
            fromPubkey: tempAccount.publicKey,
            toPubkey: payer.publicKey,
            lamports: await connection.getBalance(tempAccount.publicKey)
        });

            const recentBlockhash = await connection.getLatestBlockhash().then(res => res.blockhash);

            const message = new TransactionMessage({
                payerKey: payer.publicKey,
                recentBlockhash,
                instructions: [
                    createTempAccountIx,
                    transferToDestinationIx,
                    closeAccountIx

                ],
            }).compileToV0Message();

            const tx = new VersionedTransaction(message);

            tx.sign([payer, tempAccount]);
            const sig = await connection.sendTransaction(tx);

            printConsoleSeparator();

            console.log("Transaction completed.");
            console.log(explorerURL({ txSignature: sig }));

        } catch (error) {
            console.error("An error occurred:");
            if (error instanceof Error) {
                console.error(error.message);
                if ('logs' in error && Array.isArray((error as any).logs)) {
                    console.error("Transaction logs:", (error as any).logs);
                }
            } else {
                console.error(String(error));
            }
        }
    }) ();