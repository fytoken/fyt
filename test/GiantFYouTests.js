const BigNumber = require('bignumber.js')
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'))
const { ethCall, giantFYou, getGraffiti,
      getTotalSupply, ownerOf, getBalanceOf, tokensOf,
      paintGraffiti} = require('./helpers')
const ERC721Token = artifacts.require('FYouToken')
const twoFinney = '2'
const gas = 3000000


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
  const _giantCallParams = {from: _sender, value: toWei(twoFinney), gas: gas}

  beforeEach(async function () {
    token = await ERC721Token.new({from: _creator})
    await giantFYou({token: token, to: _sender, numTokens: 2, txCallParams: [_giantCallParams]})
  })


  describe('tokens supply, balance and ids: ', function () {
    it('has a total supply equivalent to the initial supply', async function () {
      const totalSupply = await getTotalSupply({token: token})
      expect(totalSupply).to.equal(Number(2))
    })

    it('has a balance equivalent to the initial setup', async function () {
      const balance = await getBalanceOf({token: token, owner: _sender})
      expect(balance).to.equal(Number(2))
    })

    it('has a tokens equivalent to the initial setup', async function () {
      const tokens = await tokensOf({token: token, owner: _sender})
      expect(tokens).to.be.an('array')
      expect(tokens).to.deep.equal([Number(0), Number(1)])
    })

  })


  describe('getGraffiti', function () {
    it('has empty graffiti', async function () {
      const graffiti = await getGraffiti({token: token, tokenId: 0})
      expect(graffiti).to.be.an('array')
      expect(graffiti).to.deep.equal(["", ""])
    })
  })


  describe('overWriteGraffiti', function () {
    it('allow Overwrite of message', async function () {
      await paintGraffiti({token: token, tokenId: 0, message: _message, infoUrl: "", txCallParams: [_giantCallParams]})
      const graffiti = await getGraffiti({token: token, tokenId: 0})
      expect(graffiti).to.be.an('array')
      expect(graffiti).to.deep.equal([_message, ""])
    })

    it('allow Overwrite of infoUrl', async function () {
      await paintGraffiti({token: token, tokenId: 0, message: "", infoUrl: _infoUrl, txCallParams: [_giantCallParams]})
      const graffiti = await getGraffiti({token: token, tokenId: 0})
      expect(graffiti).to.be.an('array')
      expect(graffiti).to.deep.equal(["", _infoUrl])
    })

    it('allow Overwrite message and infoUrl', async function () {
      await paintGraffiti({token: token, tokenId: 0, message: _message, infoUrl: _infoUrl, txCallParams: [_giantCallParams]})
      const graffiti = await getGraffiti({token: token, tokenId: 0})
      expect(graffiti).to.be.an('array')
      expect(graffiti).to.deep.equal([_message, _infoUrl])
    })

    it('dis-allow Overwrite of message once written', async function () {
      await paintGraffiti({token: token, tokenId: 0, message: _message, infoUrl: _infoUrl, txCallParams: [_giantCallParams]})
      const tx = await paintGraffiti({token: token, tokenId: 0, message: "", infoUrl: _infoUrl, txCallParams: [_giantCallParams]})
      tx[0].assertRevert();
    })

    it('dis-allow Overwrite of infoUrl once written', async function () {
      await paintGraffiti({token: token, tokenId: 0, message: _message, infoUrl: _infoUrl, txCallParams: [_giantCallParams]})
      const tx = await paintGraffiti({token: token, tokenId: 0, message: _message, infoUrl: "", txCallParams: [_giantCallParams]})
      tx[0].assertRevert();
    })

    it('dis-allow Overwrite of message and infoUrl once written', async function () {
      await paintGraffiti({token: token, tokenId: 0, message: _message, infoUrl: _infoUrl, txCallParams: [_giantCallParams]})
      const tx = await paintGraffiti({token: token, tokenId: 0, message: _message, infoUrl: _infoUrl, txCallParams: [_giantCallParams]})
      tx[0].assertRevert();
    })

    it('dis-allow Overwrite not from owner', async function () {
      const tx = await paintGraffiti({token: token, tokenId: 0, message: _message, infoUrl: _infoUrl, txCallParams: [{from: _creator, gas: gas}]})
      tx[0].assertRevert();
    })

  })


  describe('Mint many', function () {
    it('throws error if num tokens is 0', async function () {
      const tx = await giantFYou({token: token, to: _sender, numTokens: 0, txCallParams: [{from: _sender, value: toWei('0'), gas: gas}]})
      tx[0].assertRevert();
    })

    it('throws error if num tokens is greater than 10', async function () {
      const tx = await giantFYou({token: token, to: _sender, numTokens: 11, txCallParams: [{from: _sender, value: toWei('101'), gas: gas}]})
      tx[0].assertRevert();
    })

    // it('allows minting if numTokens is equal to 100', async function () {
    //   await giantFYou({token: token, to: _sender, numTokens: 100, txCallParams: [{from: _sender, value: toWei('100'), gas: 8000000}]})
    //   const totalSupply = await getTotalSupply({token: token})
    //   expect(totalSupply).to.equal(Number(102))
    //   const owner = await ownerOf({token: token, tokenId: 101}) // since 2 were previously printed
    //   expect(owner).to.equal(_sender)
    // })

    it('allows minting if numTokens is between 1 and 10', async function () {
      await giantFYou({token: token, to: _schmuck, numTokens: 10, txCallParams: [{from: _sender, value: toWei('10'), gas: 6000000}]})
      const totalSupply = await getTotalSupply({token: token})
      expect(totalSupply).to.equal(Number(12))
      const owner = await ownerOf({token: token, tokenId: 11}) // since 2 were previously printed
      expect(owner).to.equal(_schmuck)
    })
  })


})

function toWei(n) {
  return web3.utils.toWei(n, 'finney')
}