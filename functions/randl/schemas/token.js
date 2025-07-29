class Token {
  constructor({ tokenId, name, symbol, totalSupply, creator, swappable, bridge_to, mintAuthority, createdAt }) {
    this.tokenId = tokenId;
    this.name = name;
    this.symbol = symbol;
    this.totalSupply = totalSupply;
    this.creator = creator;
    this.swappable = swappable;
    this.bridge_to = bridge_to;
    this.mintAuthority = mintAuthority || [creator]; // default fallback
    this.createdAt = createdAt || new Date();
  }
}

module.exports = Token;