const mongoose = require('mongoose');
const { Game } = require('./dist/models/game.model');
const { Bid } = require('./dist/models/bid.model');
const { CommissionService } = require('./dist/services/commission.service');

mongoose.connect('mongodb+srv://shiv:laGi7nTEvu7ufnWI@rajaji.p1vjtvl.mongodb.net/Rajaji?retryWrites=true&w=majority&appName=Rajaji');

async function inspect() {
  try {
    const game = await Game.findOne({ status: 'result_declared' }).sort({ createdAt: -1 });
    if (!game) { console.log('No completed game'); return; }
    console.log('Game:', game._id.toString(), 'Winning:', game.winningCard);
    const bids = await Bid.find({ game: game._id });
    const payoutBids = bids.map(b => ({ userId: b.user.toString(), card: b.cardName, amount: b.totalAmount }));
    const results = CommissionService.calculatePayouts(payoutBids);
    console.log('PayoutResults size:', results.length);
    const winners = results.filter(r => r.winner);
    console.log('Computed Winners:', winners);
  } catch (e) {
    console.error(e);
  } finally {
    mongoose.disconnect();
  }
}

inspect();
