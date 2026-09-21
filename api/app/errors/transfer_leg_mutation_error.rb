# Raised when code attempts to mutate a financial transaction that belongs to a
# transfer aggregate. Transfer legs are immutable: the transfer is the unit of
# change, so its legs can only be recreated or reversed through TransferService.
class TransferLegMutationError < StandardError
end
