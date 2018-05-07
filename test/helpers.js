const _ = require('lodash')
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'))

module.exports.ethCall = async (callPromise) => {
  let returnVal
  try {
    returnVal = await callPromise
  } catch (_err) {
    console.log(_err)
  }

  const assertReturnValue = (expectedReturnVal) => {
    assert.equal(
      returnVal,
      expectedReturnVal,
      `expected ${expectedReturnVal} to be returned, but got ${returnVal}`
    )
  }

  return {
    returnValue: returnVal,
    assertReturnValue
  }
}

module.exports.ethTransaction = async (transactionPromise) => {

  let error, response
  try {
    response = await transactionPromise
  } catch (_err) {
    error = _err
  } finally {
    const filterEvents = (event) => {
      return _.filter(response.logs, {event})
    }

    const assertLogEvent = (eventParams) => {
      for (let index = 0; index < eventParams.length; index++) {
        const events = filterEvents(eventParams[index].event)
        const event = events[0]
        assert.equal(events.length, 1 , `expected 1 ${eventParams.event} event but got ${events.length}`)
        _.forEach(_.keys(eventParams[index]), (p) => {
          if (p !== 'event') {
            assert.equal(
              event.args[p],
              eventParams[index][p],
              `expected event property '${eventParams[index].event}.${p}' to be ${eventParams[index][p]}, ` +
              `but got ${event.args[p]}`
            )
          }
        })
      }
    }

    const assertThrewError = () => {
      assert.equal(
        typeof error === 'undefined',
        false,
        `expected an error, but no error was thrown`
      )
    }

    const assertRevert = () => {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }

    return {
      response: response,
      error: error,
      filterEvents,
      assertLogEvent,
      assertThrewError,
      assertRevert
    }
  }

}

// module.exports.assertRevert = async (promise) => {
//   try {
//     await promise;
//     assert.fail('Expected revert not received');
//   } catch (error) {
//     const revertFound = error.message.search('revert') >= 0;
//     assert(revertFound, `Expected "revert", got ${error} instead`);
//   }
// }

module.exports.assertError = async (promise) => {
  try {
    await promise;
    assert.fail('Expected revert not received');
  } catch (error) {
    console.log(JSON.stringify(error))
  }
}

module.exports.fYouTx = async (params) => {
  const {token, schmuck, message, infoUrl, txCallParams} = params
  if (typeof txCallParams !== 'undefined') {
    return await Promise.all(_.map(txCallParams, (c) => {
      return module.exports.ethTransaction(token.fYou(schmuck, message, infoUrl, {from: c.from, value: c.value, gas: c.gas}))
    }))
  }
}

module.exports.giantFYou = async (params) => {
  const {token, to, numTokens, txCallParams} = params
  if (typeof txCallParams !== 'undefined') {
    return await Promise.all(_.map(txCallParams, (c) => {
      return module.exports.ethTransaction(token.giantFYou(to, numTokens, {from: c.from, value: c.value, gas: c.gas}))
    }))
  }
}

module.exports.paintGraffiti = async (params) => {
  const {token, tokenId, message, infoUrl, txCallParams} = params
  if (typeof txCallParams !== 'undefined') {
    return await Promise.all(_.map(txCallParams, (c) => {
      return module.exports.ethTransaction(token.paintGraffiti(tokenId, message, infoUrl, {from: c.from, gas: c.gas}))
    }))
  }
}

module.exports.withdrawFees = async (params) => {
  const {token, to, amount, txCallParams} = params
  if (typeof txCallParams !== 'undefined') {
    return await Promise.all(_.map(txCallParams, (c) => {
      return module.exports.ethTransaction(token.withdrawFees(to, amount, {from: c.from, gas: c.gas}))
    }))
  }
}

module.exports.setFee = async (params) => {
  const {token, fee, txCallParams} = params
  return module.exports.ethTransaction(token.setFee(fee, {from: txCallParams.from, gas: txCallParams.gas}))
}


module.exports.getTotalSupply = async (params) => {
  const {token} = params
  const ownerBalanceResult = await module.exports.ethCall(token.totalSupply.call())
  return web3.utils.toBN(ownerBalanceResult.returnValue).toNumber()
}

module.exports.getFeesAvailableForWithdraw = async (params) => {
  const {token} = params
  const ownerBalanceResult = await module.exports.ethCall(token.getFeesAvailableForWithdraw.call())
  return web3.utils.toBN(ownerBalanceResult.returnValue).toString(10)
}

module.exports.ownerOf = async (params) => {
  const {token, tokenId} = params
  const result = await module.exports.ethCall(token.ownerOf.call(tokenId))
  return result.returnValue
}

module.exports.getBalanceOf = async (params) => {
  const {token, owner} = params
  const balanceOf = await module.exports.ethCall(token.balanceOf.call(owner))
  return web3.utils.toBN(balanceOf.returnValue).toNumber()
}

module.exports.getGraffiti = async (params) => {
  const {token, tokenId} = params
  const graffiti = await module.exports.ethCall(token.getGraffiti.call(tokenId))
  return graffiti.returnValue;
}

module.exports.tokensOf = async (params) => {
  const {token, owner} = params
  const tokens = await module.exports.ethCall(token.tokensOf.call(owner))
  return tokens.returnValue.map(val => {
    return web3.utils.toBN(val).toNumber()
  })
}

module.exports.transferTx = async (params) => {
  const {token, from, to, tokenId, txCallParams} = params
  if (typeof txCallParams !== 'undefined') {
    return await Promise.all(_.map(txCallParams, (c) => {
      return module.exports.ethTransaction(token.transfer(to, tokenId, {from: from, gas: c.gas}))
    }))
  }
}

module.exports.approveTx = async (params) => {
  const {token, from, to, tokenId, txCallParams} = params
  if (typeof txCallParams !== 'undefined') {
    return await Promise.all(_.map(txCallParams, (c) => {
      return module.exports.ethTransaction(token.approve(to, tokenId, {from: from, gas: c.gas}))
    }))
  }
}

module.exports.approvedFor = async (params) => {
  const {token, tokenId} = params
  const ownerBalanceResult = await module.exports.ethCall(token.approvedFor.call(tokenId))
  return ownerBalanceResult.returnValue
}


module.exports.doTransferFlow = async (params) => {
  const {token, to, tokenId, sender, approved, txCallParams} = params
  const tx = await module.exports.doTransferTx({token: token, to: to, tokenId: tokenId, txCallParams: txCallParams})
  tx[0].assertLogEvent([{event: 'Approval', _owner: sender, _approved: approved, _tokenId: tokenId},
    {event: 'Transfer', _from: sender, _to: to, _tokenId: tokenId}])
}

module.exports.doTransferTx = async (params)  => {
  const {token, to, tokenId, txCallParams} = params
  if (typeof txCallParams !== 'undefined') {
    return await Promise.all(_.map(txCallParams, (c) => {
      return module.exports.ethTransaction(token.transfer(to, tokenId, {from: c.from, value: c.value, gas: c.gas}))
    }))
  }
}