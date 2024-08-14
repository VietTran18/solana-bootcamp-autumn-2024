import { Keypair, Connection, PublicKey } from "@solana/web3.js";
import { Metaplex, keypairIdentity } from "@metaplex-foundation/js";
import { payer } from "../code/lib/vars";
import { explorerURL, printConsoleSeparator } from "../code/lib/helpers";


const connection = new Connection("https://api.devnet.solana.com");

(async () => {
  try {
    console.log("Payer address:", payer.publicKey.toBase58());

    // Define metadata for the NFT
    const metadata = {
      name: "Solana Bootcamp Autumn 2024",
      symbol: "SBS",
      description: "An NFT for Solana Bootcamp Autumn 2024 with unique traits.",
      image:
        "https://github.com/trankhacvy/solana-bootcamp-autumn-2024/blob/main/assets/logo.png?raw=true",
      attributes: [
        { trait_type: "Background", value: "Autumn" },
        { trait_type: "Special Feature", value: "Bootcamp Exclusive" },
        { trait_type: "Edition", value: "2024" }
      ]
    };

    console.log("Uploading metadata...");

    // Create a Metaplex instance
    const metaplex = Metaplex.make(connection)
      .use(keypairIdentity(payer));

    // Upload metadata and get URI
    const { uri } = await metaplex.nfts().uploadMetadata(metadata);
    console.log("Metadata uploaded:", uri);

    printConsoleSeparator("NFT details");

    console.log("Creating NFT using Metaplex...");

    // Generate a new Keypair for the token mint
    const tokenMint = Keypair.generate();

    // Create the NFT
    const { nft, response } = await metaplex.nfts().create({
      uri,
      name: metadata.name,
      symbol: metadata.symbol,
      useNewMint: tokenMint,
      sellerFeeBasisPoints: 1000, // 10% royalty
      isMutable: true,
    });

    console.log(nft);

    printConsoleSeparator("NFT created:");
    console.log("Transaction Signature:", response.signature);
    console.log("Explorer URL:", explorerURL({ txSignature: response.signature }));

    printConsoleSeparator("Find by mint:");

    // Retrieve NFT info by mint address
    const mintInfo = await metaplex.nfts().findByMint({
      mintAddress: tokenMint.publicKey,
    });
    console.log(mintInfo);
  } catch (error) {
    console.error("Error uploading metadata or creating NFT:", error);
  }
})();
