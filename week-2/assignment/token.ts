import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

import {
  PROGRAM_ID as METADATA_PROGRAM_ID,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";

import { payer, connection } from "../code/lib/vars";

import {
  buildTransaction,
  explorerURL,
  extractSignatureFromFailedTransaction,
  printConsoleSeparator,
  savePublicKeyToFile,
} from "../code/lib/helpers";

(async () => {
  console.log("Payer address:", payer.publicKey.toBase58());

  const mintKeypair = Keypair.generate();
  console.log("Mint address:", mintKeypair.publicKey.toBase58());

  const tokenConfig = {
    decimals: 6,
    name: "Monkey",
    symbol: "MOK",
    uri: "https://raw.githubusercontent.com/VietTran18/token-metadata/main/metadata.json",
  };

  const createMintAccountInstruction = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mintKeypair.publicKey,
    space: MINT_SIZE,
    lamports: await connection.getMinimumBalanceForRentExemption(MINT_SIZE),
    programId: TOKEN_PROGRAM_ID,
  });

  const initializeMintInstruction = createInitializeMint2Instruction(
    mintKeypair.publicKey,
    tokenConfig.decimals,
    payer.publicKey,
    payer.publicKey,
  );

  const metadataAccount = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
    METADATA_PROGRAM_ID,
  )[0];

  console.log("Metadata address:", metadataAccount.toBase58());

  const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
    {
      metadata: metadataAccount,
      mint: mintKeypair.publicKey,
      mintAuthority: payer.publicKey,
      payer: payer.publicKey,
      updateAuthority: payer.publicKey,
    },
    {
      createMetadataAccountArgsV3: {
        data: {
          creators: null,
          name: tokenConfig.name,
          symbol: tokenConfig.symbol,
          uri: tokenConfig.uri,
          sellerFeeBasisPoints: 0,
          collection: null,
          uses: null,
        },
        collectionDetails: null,
        isMutable: true,
      },
    },
  );

  const associatedToken = getAssociatedTokenAddressSync(mintKeypair.publicKey, payer.publicKey);
  const ataInstruction = createAssociatedTokenAccountInstruction(
    payer.publicKey,
    associatedToken,
    payer.publicKey,
    mintKeypair.publicKey,
    TOKEN_PROGRAM_ID,
  );

  const mintToInstruction = createMintToInstruction(
    mintKeypair.publicKey,
    associatedToken,
    payer.publicKey,
    100_000_000,
    [],
    TOKEN_PROGRAM_ID,
  );

  const recipientPublicKey = new PublicKey('63EEC9FfGyksm7PkVC6z8uAmqozbQcTzbkWJNsgqjkFs');
  const recipientAssociatedToken = getAssociatedTokenAddressSync(
    mintKeypair.publicKey,
    recipientPublicKey,
  );

  const recipientAtaInstruction = createAssociatedTokenAccountInstruction(
    payer.publicKey,
    recipientAssociatedToken,
    recipientPublicKey,
    mintKeypair.publicKey,
  );

  const mintToRecipientInstruction = createMintToInstruction(
    mintKeypair.publicKey,
    recipientAssociatedToken,
    payer.publicKey,
    10_000_000,
    [],
    TOKEN_PROGRAM_ID,
  );

  const tx = await buildTransaction({
    connection,
    payer: payer.publicKey,
    signers: [payer, mintKeypair],
    instructions: [
      createMintAccountInstruction,
      initializeMintInstruction,
      createMetadataInstruction,
      ataInstruction,
      mintToInstruction,
      recipientAtaInstruction,
      mintToRecipientInstruction,
    ],
  });

  printConsoleSeparator();

  try {
    const sig = await connection.sendTransaction(tx);
    console.log("Transaction completed.");
    console.log(explorerURL({ txSignature: sig }));
    savePublicKeyToFile("tokenMint", mintKeypair.publicKey);
  } catch (err) {
    console.error("Failed to send transaction:");
    console.log(tx);
    const failedSig = await extractSignatureFromFailedTransaction(connection, err);
    if (failedSig) console.log("Failed signature:", explorerURL({ txSignature: failedSig }));
    throw err;
  }
})();
