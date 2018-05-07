const _ = require('lodash')
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'))
const {ethTransaction, ethCall} = require('./helpers')
const Graffiti = artifacts.require("FYouToken")
const oneFinney = '1'
let accounts
let owner
let test
let schmuck

contract('Graffiti', function (_accounts) {
  accounts = _accounts
  owner = accounts[0]
  test = accounts[1]
  schmuck = accounts[2]

  describe('fYou()', () => {
    let graffiti

    before(async () => {
      graffiti = await Graffiti.new()
    });

    it('should emit event and create a FYT', async () => {
      return await cheapFuckYouTest({
        graffiti: graffiti,
        schmuck: schmuck,
        message: 'Hello World!',
        infoUrl: 'Qmcpo2iLBikrdf1d6QU6vXuNb6P7hwrbNPW9kLAH8eG67z',
        txCallParams: [{from: test, value: toWei(oneFinney), gas: 3000000}],
        txEvent: true,
        from: 0x0000000000000000000000000000000000000000
      })
    })

    it('should throw in case of less amount of finney fee', async () => {
      return await cheapFuckYouTest({
        graffiti: graffiti,
        schmuck: schmuck,
        message: 'Hello World!',
        infoUrl: 'Qmcpo2iLBikrdf1d6QU6vXuNb6P7hwrbNPW9kLAH8eG67z',
        txCallParams: [{from: test, value: toWei('0'), gas: 3000000}],
        txEvent: false,
        expectThrow: true,
        from: 0x0000000000000000000000000000000000000000
      })
    })

    it('should throw in case of more amount of finney fee', async () => {
      return await cheapFuckYouTest({
        graffiti: graffiti,
        schmuck: schmuck,
        message: 'Hello World!',
        infoUrl: 'Qmcpo2iLBikrdf1d6QU6vXuNb6P7hwrbNPW9kLAH8eG67z',
        txCallParams: [{from: test, value: toWei('3'), gas: 3000000}],
        txEvent: false,
        expectThrow: true,
        from: 0x0000000000000000000000000000000000000000
      })
    })

    it('should throw in case TO address is invalid', async () => {
      return await cheapFuckYouTest({
        graffiti: graffiti,
        schmuck: 0x0000000000000000000000000000000000000000,
        message: 'Hello World!',
        infoUrl: 'Qmcpo2iLBikrdf1d6QU6vXuNb6P7hwrbNPW9kLAH8eG67z',
        txCallParams: [{from: test, value: toWei(oneFinney), gas: 3000000}],
        txEvent: false,
        expectThrow: true,
        from: 0x0000000000000000000000000000000000000000
      })
    })

    it('Ownership number and total tokens should add up', async () => {
      await cheapFuckYouTest({
        graffiti: graffiti,
        schmuck: schmuck,
        message: 'Hello World!',
        infoUrl: 'Qmcpo2iLBikrdf1d6QU6vXuNb6P7hwrbNPW9kLAH8eG67z',
        txCallParams: [{from: test, value: toWei(oneFinney), gas: 3000000}],
        txEvent: true,
        from: 0x0000000000000000000000000000000000000000
      })
      return await testOwnershipNumbers({
        graffiti: graffiti,
        schmuck: schmuck,
        multipleOwners: false
      })
    })

  })

})

async function cheapFuckYouTest(params) {
  const {graffiti, txEvent, expectThrow, from, schmuck} = params

  const tx = await doCheapFuckTx(params)
  if (txEvent) {
    const numTokens = (await totalSupply(params)).toNumber()
    tx[0].assertLogEvent([{event: 'Transfer', _from: from, _to: schmuck, _tokenId: (numTokens - 1)}])
    // check if fees available for withdraw matches up
    const feesResult = await ethCall(graffiti.getFeesAvailableForWithdraw.call())
    const feesAvailable = web3.utils.toBN(feesResult.returnValue)
    const expectedFees = web3.utils.toBN(toWei(numTokens.toString())) //.mul(web3.utils.toBN('2'))
    assert.equal(expectedFees.toString(16), feesAvailable.toString(16), `Expected and actual fees do not match`)
  }

  if (expectThrow) {
    tx[0].assertThrewError()
    tx[0].assertRevert()
  }

  return graffiti
}

async function testOwnershipNumbers(params) {
  const {multipleOwners} = params
  const numTokens = await totalSupply(params)
  const ownerBalance = await getOwnerBalance(params)
  if (!multipleOwners) {
    assert.equal(numTokens.toString(16), ownerBalance.toString(16), `Expected Ownership and token numbers to be equal`)
  }
}

async function totalSupply(params) {
  const {graffiti} = params
  const numTokensResult = await ethCall(graffiti.totalSupply.call())
  return web3.utils.toBN(numTokensResult.returnValue);
}

async function getOwnerBalance(params) {
  const {graffiti, schmuck} = params
  const ownerBalanceResult = await ethCall(graffiti.balanceOf.call(schmuck))
  return web3.utils.toBN(ownerBalanceResult.returnValue)
}

async function doCheapFuckTx(params) {
  const {graffiti, schmuck, message, infoUrl, txCallParams} = params
  if (typeof txCallParams !== 'undefined') {
    return Promise.all(_.map(txCallParams, (c) => {
      return ethTransaction(graffiti.fYou(schmuck, message, infoUrl, {from: c.from, value: c.value, gas: c.gas}))
    }))
  }
}

function toWei(n) {
  return web3.utils.toWei(n, 'finney')
}