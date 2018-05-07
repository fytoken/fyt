const BigNumber = require('bignumber.js')
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'))

const { fYouTx, giantFYou, getTotalSupply, setFee,
        withdrawFees, getFeesAvailableForWithdraw} = require('./helpers')

const oneFinney = '1'
const twoFinney = '2'
const gas = 3000000

const ERC721Token = artifacts.require('FYouToken')

const expect = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .expect

contract('ERC721Token', accounts => {
  let token = null
  const _creator = accounts[0]
  const _sender = accounts[1]
  const _schmuck = accounts[2]
  const _message = 'Hello World!'
  const _infoUrl = 'Qmcpo2iLBikrdf1d6QU6vXuNb6P7hwrbNPW9kLAH8eG67z'
  const _txCallParams = {from: _sender, value: toWei(oneFinney), gas: gas}
  const _giantCallParams = {from: _sender, value: toWei(twoFinney), gas: gas}

  describe('totalSupply', function () {
    beforeEach(async function () {
      token = await ERC721Token.new({from: _creator})
      await fYouTx({token: token, schmuck: _schmuck, message: _message, infoUrl: _infoUrl, txCallParams: [_txCallParams, _txCallParams]})
      await giantFYou({token: token, to: _sender, numTokens: 2, txCallParams: [_giantCallParams]})
    })

    it('has a total supply equivalent to the initial supply', async function () {
      const totalSupply = await getTotalSupply({token: token})
      expect(totalSupply).to.equal(Number(4))
    })
  })

  describe('Fees and Withdrawal', function () {
    const ownerCallParams = {from: _creator, gas: gas}
    beforeEach(async function () {
      token = await ERC721Token.new({from: _creator})
      await fYouTx({token: token, schmuck: _schmuck, message: _message, infoUrl: _infoUrl, txCallParams: [_txCallParams, _txCallParams]})
      await giantFYou({token: token, to: _sender, numTokens: 2, txCallParams: [_giantCallParams]})
    })

    it('has fees that equivalent to the initial supply', async function () {
      const fees = await getFeesAvailableForWithdraw({token: token})
      expect(fees).to.equal('4000000000000000')
    })

    it('can withdraw all the available fees', async function () {
      await withdrawFees({token: token, to: _sender, amount: toWei('4'), txCallParams: [ownerCallParams]})
      const fees = await getFeesAvailableForWithdraw({token: token})
      expect(Number(fees)).to.equal(Number(0))
    })

    it('can withdraw less than available fees', async function () {
      await withdrawFees({token: token, to: _sender, amount: toWei('3'), txCallParams: [ownerCallParams]})
      const fees = await getFeesAvailableForWithdraw({token: token})
      expect(fees).to.equal('1000000000000000')
    })

    it('throw when withdrawing more than available fees', async function () {
      const tx = await withdrawFees({token: token, to: _sender, amount: toWei('5'), txCallParams: [ownerCallParams]})
      tx[0].assertRevert()
    })

    it('throw when withdrawing done by non-owner', async function () {
      const tx = await withdrawFees({token: token, to: _sender, amount: toWei('4'), txCallParams: [_txCallParams]})
      tx[0].assertRevert()
    })

  })

  describe('Reset fees: ', function () {
    const ownerCallParams = {from: _creator, gas: gas}
    beforeEach(async function () {
      token = await ERC721Token.new({from: _creator})
    })

    it('has fees available to withdraw that is equivalent to the new fee', async function () {
      await setFee({token: token, fee: 5, txCallParams: ownerCallParams})
      await fYouTx({token: token, schmuck: _schmuck, message: _message, infoUrl: _infoUrl, txCallParams: [{from: _sender, value: toWei('5'), gas: gas}]})
      await giantFYou({token: token, to: _sender, numTokens: 2, txCallParams: [{from: _sender, value: toWei('10'), gas: gas}]})
      const fees = await getFeesAvailableForWithdraw({token: token})
      expect(fees).to.equal('15000000000000000')
      const totalSupply = await getTotalSupply({token: token})
      expect(totalSupply).to.equal(Number(3))
    })

    it('can set fee to 0', async function () {
      await setFee({token: token, fee: 0, txCallParams: ownerCallParams})
      await fYouTx({token: token, schmuck: _schmuck, message: _message, infoUrl: _infoUrl, txCallParams: [{from: _sender, value: toWei('0'), gas: gas}]})
      await giantFYou({token: token, to: _sender, numTokens: 2, txCallParams: [{from: _sender, value: toWei('0'), gas: gas}]})
      const fees = await getFeesAvailableForWithdraw({token: token})
      expect(Number(fees)).to.equal(Number(0))
      const totalSupply = await getTotalSupply({token: token})
      expect(totalSupply).to.equal(Number(3))
    })

    it('Change fee between transactions, new txns should be charge new fee', async function () {
      await setFee({token: token, fee: 5, txCallParams: ownerCallParams})
      await fYouTx({token: token, schmuck: _schmuck, message: _message, infoUrl: _infoUrl, txCallParams: [{from: _sender, value: toWei('5'), gas: gas}]})
      await setFee({token: token, fee: 2, txCallParams: ownerCallParams})
      await giantFYou({token: token, to: _sender, numTokens: 2, txCallParams: [{from: _sender, value: toWei('4'), gas: gas}]})
      const fees = await getFeesAvailableForWithdraw({token: token})
      expect(fees).to.equal('9000000000000000')
      const totalSupply = await getTotalSupply({token: token})
      expect(totalSupply).to.equal(Number(3))
    })

    it('After fee reset, transactions, with wrong fee will revert', async function () {
      await setFee({token: token, fee: 5, txCallParams: ownerCallParams})
      await fYouTx({token: token, schmuck: _schmuck, message: _message, infoUrl: _infoUrl, txCallParams: [{from: _sender, value: toWei('5'), gas: gas}]})
      await setFee({token: token, fee: 2, txCallParams: ownerCallParams})
      const tx = await giantFYou({token: token, to: _sender, numTokens: 2, txCallParams: [{from: _sender, value: toWei('10'), gas: gas}]})
      tx[0].assertRevert()
    })

    it('Fee is not allowed to be reset by non-owner', async function () {
      const tx = await setFee({token: token, fee: 5, txCallParams: _txCallParams})
      tx.assertRevert()
    })

  })

})

function toWei(n) {
  return web3.utils.toWei(n, 'finney')
}