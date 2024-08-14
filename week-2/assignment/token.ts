import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMint2Instruction,
  getOrCreateAssociatedTokenAccount,
  createMintToInstruction,
} from "@solana/spl-token";
import {
  PROGRAM_ID as METADATA_PROGRAM_ID,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";

import { payer, connection } from "../code/lib/vars";
import { explorerURL, printConsoleSeparator, loadPublicKeysFromFile } from "../code/lib/helpers";

// Utility function to add delay
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  try {
    console.log("Payer address:", payer.publicKey.toBase58());
    const currentBalance = await connection.getBalance(payer.publicKey);
    console.log("Current balance of 'payer' (in lamports):", currentBalance);
    console.log("Current balance of 'payer' (in SOL):", currentBalance / LAMPORTS_PER_SOL);

    const mintKeypair = Keypair.generate();
    console.log("New mint address:", mintKeypair.publicKey.toBase58());

    const tokenConfig = {
      decimals: 6,
      name: "Monkey",
      symbol: "MOK",
      uri: "https://raw.githubusercontent.com/VietTran18/token-metadata/main/metadata.json",
    };

    // Create mint account
    const createMintAccountInstruction = SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports: await connection.getMinimumBalanceForRentExemption(MINT_SIZE),
      programId: TOKEN_PROGRAM_ID,
    });

    // Initialize mint
    const initializeMintInstruction = createInitializeMint2Instruction(
      mintKeypair.publicKey,
      tokenConfig.decimals,
      payer.publicKey,
      payer.publicKey
    );

    // Create metadata account
    const metadataAccount = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
      METADATA_PROGRAM_ID
    )[0];
    console.log("Metadata address:", metadataAccount.toBase58());

    const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataAccount,
        mint: mintKeypair.publicKey,
        mintAuthority: payer.publicKey,
        payer: payer.publicKey,
        updateAuthority: payer.publicKey
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name: tokenConfig.name,
            symbol: tokenConfig.symbol,
            uri: tokenConfig.uri,
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null
          },
          isMutable: true,
          collectionDetails: null
        }
      }
    );

    // Create and send transaction for mint and metadata
    const initialTransaction = new Transaction().add(
      createMintAccountInstruction,
      initializeMintInstruction,
      createMetadataInstruction
    );

    const initialSignature = await sendAndConfirmTransaction(
      connection,
      initialTransaction,
      [payer, mintKeypair]
    );

    console.log("Initial transaction sent and confirmed. Signature:", initialSignature);
    console.log("Explorer URL:", explorerURL({ txSignature: initialSignature }));

    // Wait for some time to ensure mint and metadata creation
    console.log("Waiting for 10 seconds to ensure mint and metadata are created...");
    await delay(10000);

    // Create ATA for payer
    const payerATA = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mintKeypair.publicKey,
      payer.publicKey
    );
    console.log("Payer's ATA address:", payerATA.address.toBase58());

    // Create ATA for recipient
    const recipientAddress = new PublicKey("63EEC9FfGyksm7PkVC6z8uAmqozbQcTzbkWJNsgqjkFs");
    const recipientATA = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mintKeypair.publicKey,
      recipientAddress
    );
    console.log("Recipient's ATA address:", recipientATA.address.toBase58());

    // Create mint instructions
    const mintToPayerInstruction = createMintToInstruction(
      mintKeypair.publicKey,
      payerATA.address,
      payer.publicKey,
      100 * 10 ** tokenConfig.decimals // 100 tokens
    );

    const mintToRecipientInstruction = createMintToInstruction(
      mintKeypair.publicKey,
      recipientATA.address,
      payer.publicKey,
      10 * 10 ** tokenConfig.decimals // 10 tokens
    );

    // Create and send transaction for minting tokens
    const mintTransaction = new Transaction().add(
      mintToPayerInstruction,
      mintToRecipientInstruction
    );

    const mintSignature = await sendAndConfirmTransaction(
      connection,
      mintTransaction,
      [payer]
    );

    console.log("Mint transaction sent and confirmed. Signature:", mintSignature);
    console.log("Explorer URL:", explorerURL({ txSignature: mintSignature }));

    console.log("Token created and minted successfully:");
    console.log("Mint address:", mintKeypair.publicKey.toBase58());
    console.log("Payer received:", 100, "tokens");
    console.log("Recipient received:", 10, "tokens");
    console.log("Recipient address:", recipientAddress.toBase58());

  } catch (error) {
    console.error("Error performing transaction:", error);
  }
})();
