const admin = require('firebase-admin');

exports.logTransaction = async ({
  tokenId,
  from = null,
  to = null,
  amount,
  type,
  initiatedBy,
  metadata = {}
}) => {
  const db = admin.firestore();
  return await db.collection('transactions').add({
    tokenId,
    from,
    to,
    amount,
    type,
    initiatedBy,
    metadata,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
};
