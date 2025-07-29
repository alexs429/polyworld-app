class Balance {
  constructor({ userId, tokenId, totalBalance, withdrawableBalance, lockedBalance, updatedAt }) {
    this.userId = userId;
    this.tokenId = tokenId;
    this.totalBalance = totalBalance;
    this.withdrawableBalance = withdrawableBalance;
    this.lockedBalance = lockedBalance;
    this.updatedAt = updatedAt || new Date();
  }
}

module.exports = Balance;