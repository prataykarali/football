#[starknet::interface]
trait IVantageEngagementProof<TContractState> {
    fn record_proof(
        ref self: TContractState,
        proof_id: felt252,
        accuracy_bps: u64,
        engagement_fingerprint: felt252,
        recorded_at: u64
    );
    fn get_proof(self: @TContractState, proof_id: felt252) -> (u64, felt252, u64);
    fn has_proof(self: @TContractState, proof_id: felt252) -> bool;
    fn get_proof_count(self: @TContractState) -> u64;
}

#[starknet::contract]
mod VantageEngagementProof {
    use starknet::storage::Map;

    #[storage]
    struct Storage {
        // proof_id -> accuracy_bps
        proof_accuracy: Map<felt252, u64>,
        // proof_id -> engagement_fingerprint
        proof_fingerprint: Map<felt252, felt252>,
        // proof_id -> recorded_at
        proof_timestamp: Map<felt252, u64>,
        // total number of proofs recorded
        proof_count: u64,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        ProofRecorded: ProofRecorded,
    }

    #[derive(Drop, starknet::Event)]
    struct ProofRecorded {
        #[key]
        proof_id: felt252,
        accuracy_bps: u64,
        recorded_at: u64,
    }

    #[abi(embed_v0)]
    impl VantageEngagementProofImpl of super::IVantageEngagementProof<ContractState> {
        fn record_proof(
            ref self: ContractState,
            proof_id: felt252,
            accuracy_bps: u64,
            engagement_fingerprint: felt252,
            recorded_at: u64
        ) {
            // Validate accuracy_bps is within valid range (0-10000 basis points)
            assert(accuracy_bps <= 10000, 'accuracy_bps exceeds 10000');

            // Validate recorded_at is non-zero
            assert(recorded_at != 0, 'recorded_at must be non-zero');

            // Store the proof fields individually (Cairo doesn't support tuple storage in Map)
            self.proof_accuracy.write(proof_id, accuracy_bps);
            self.proof_fingerprint.write(proof_id, engagement_fingerprint);
            self.proof_timestamp.write(proof_id, recorded_at);

            // Increment proof count
            self.proof_count.write(self.proof_count.read() + 1);

            // Emit event
            self.emit(Event::ProofRecorded(ProofRecorded {
                proof_id,
                accuracy_bps,
                recorded_at,
            }));
        }

        fn get_proof(self: @ContractState, proof_id: felt252) -> (u64, felt252, u64) {
            let accuracy = self.proof_accuracy.read(proof_id);
            let fingerprint = self.proof_fingerprint.read(proof_id);
            let timestamp = self.proof_timestamp.read(proof_id);
            (accuracy, fingerprint, timestamp)
        }

        fn has_proof(self: @ContractState, proof_id: felt252) -> bool {
            let recorded_at = self.proof_timestamp.read(proof_id);
            recorded_at != 0
        }

        fn get_proof_count(self: @ContractState) -> u64 {
            self.proof_count.read()
        }
    }
}
