const createEntry = useMutation<string, Error, CreateEntryArgs>({
    mutationKey: ["journalEntry", "create", { cluster }],
    mutationFn: async ({ title, message, owner }) => {
      const [journalEntryAddress] = await PublicKey.findProgramAddress(
        [Buffer.from(title), owner.toBuffer()],
        programId,
      );
   
      return program.methods
        .createJournalEntry(title, message)
        .accounts({
          journalEntry: journalEntryAddress,
        })
        .rpc();
    },
    onSuccess: signature => {
      transactionToast(signature);
      accounts.refetch();
    },
    onError: error => {
      toast.error(`Failed to create journal entry: ${error.message}`);
    },
  });