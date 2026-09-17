const { User, Stock, Post, Follow, Like, Comment, Holding, Transaction } = require('./src/models');

async function countData() {
  try {
    const userCount = await User.count({ where: { email: { [require('sequelize').Op.like]: 'user%@hipo.com' } } });
    const stockCount = await Stock.count();
    const postCount = await Post.count();
    const followCount = await Follow.count();
    const likeCount = await Like.count();
    const commentCount = await Comment.count();
    const holdingCount = await Holding.count();
    const transactionCount = await Transaction.count();

    console.log('\n📊 Database Statistics:');
    console.log('='.repeat(50));
    console.log(`Seed Users (user*@hipo.com): ${userCount}`);
    console.log(`Total Stocks: ${stockCount}`);
    console.log(`Total Posts: ${postCount}`);
    console.log(`Total Follows: ${followCount}`);
    console.log(`Total Likes: ${likeCount}`);
    console.log(`Total Comments: ${commentCount}`);
    console.log(`Total Holdings: ${holdingCount}`);
    console.log(`Total Transactions: ${transactionCount}`);
    console.log('='.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

countData();
