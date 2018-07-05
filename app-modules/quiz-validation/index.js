const  _ = require('lodash')
const quizTypes = require('app-modules/constants/quiz-types');
const { precise_round } = require('app-modules/utils/math-utils')

const RIGHT_ANSWER = 'Correct!'
const WRONG_ANSWER = 'Not correct.'

function validateAnswer(data, ignoreList = []) {
  // TODO: some checking
  if (!data) {
    throw new Error('no data for validation')
  }
  
  const { quiz, answer, peerReviews } = data
  const answerData = _.get(answer, '[0].data', {})
  const { regex, multi, rightAnswer, submitMessage } = _.get(quiz, 'data.meta', {})
  const { items, choices } = _.get(quiz, 'data', {}) 

  let points = 0
  let normalizedPoints = 0
  let messages = {}

  let maxPoints = 1 

  switch (quiz.type) {
    case quizTypes.ESSAY:
      messages = {
        message: submitMessage,
        error: false
      }
      points = answer[0].confirmed ? 1 : 0
      normalizedPoints = points
      break
    case quizTypes.RADIO_MATRIX:
      messages = validateRadioMatrixData(quiz, answerData)
      points = Object.keys(messages).filter(key => !messages[key].error).length

/*       points = multi
        ? (items.map(item => {
            const userAnswer = typeof answerData[item.id] === 'string' ? [answerData[item.id]] : answerData[item.id]

            if (!answerData[item.id] || (!!answerData[item.id] && answerData[item.id].length === 0)) {
              return false
            } 
            return userAnswer
              .map(k => (rightAnswer[item.id] || []).indexOf(k) >= 0)
              .every(v => !!v)
            && (rightAnswer[item.id] || [])
              .map(k => userAnswer.indexOf(k) >= 0)
              .every(v => !!v)
          }).filter(v => v).length)
        : (items.map(item => {
          if (!answerData[item.id] || (!!answerData[item.id] && answerData[item.id].length === 0)) {
            return false
          } 
          return (rightAnswer[item.id] || []).indexOf(answerData[item.id]) >= 0
        }).filter(v => v).length) */
      maxPoints = items.length
      normalizedPoints = points / maxPoints
      break
    case quizTypes.MULTIPLE_CHOICE:
      messages = validateMultipleChoiceData(quiz, answerData)
      points = 1 * !messages.error
      // points = rightAnswer.some(o => o === answerData) ? 1 : 0
      normalizedPoints = points
      break
    case quizTypes.OPEN:
      messages = validateOpenData(quiz, answerData)
      points = 1 * !messages.error
/*       if (regex) {
        try {
          let re = new RegExp(rightAnswer)
          points = !!re.exec(answerData.trim().toLowerCase()) ? 1 : 0
        } catch(err) {
          // points 0
        }
      } else {
        points = answerData.trim().toLowerCase() === rightAnswer.trim().toLowerCase() ? 1 : 0
      } */
      normalizedPoints = points
      break
    case quizTypes.MULTIPLE_OPEN:
      messages = validateMultipleOpenData(quiz, answerData)
      points = Object.keys(messages).filter(key => !messages[key].error).length

/*       if (regex) {
        points = items.map(item => {
          try {
            let re = new RegExp(rightAnswer[item.id])
            return !!re.exec(answerData[item.id].trim().toLowerCase())
          } catch(err) {
            return false
          }
        }).filter(v => v).length              
      } else {
        points = items.map(item => 
          answerData[item.id].trim().toLowerCase() === rightAnswer[item.id].trim().toLowerCase()
        ).filter(v => v).length
      } */
      maxPoints = items.length
      normalizedPoints = points / maxPoints
      break
    default:
      break
  }

/*   if (_.includes(ignoreList, quiz._id.toString())) {
    points = maxPoints
    normalizedPoints = 1
  } */

  const returnObject = {
    quiz,
    answer,
    peerReviews,
    validation: {
      messages,
      rightAnswer,
      points,
      maxPoints,
      normalizedPoints: precise_round(normalizedPoints, 2)
    }
  }  

  return returnObject
}

function validateRadioMatrixData(quiz, data) {
  const { items, meta } = quiz.data
  const rightAnswer = meta.rightAnswer

  if (!data) {
    return {}
  }

  let messages = {}

  items.forEach(item => {
    let message = ''
    let error = false
    let correct = false

    // TODO (?) only accepts 100% correct in multi
    if (meta.multi && !!data[item.id]) {
      const answer = typeof data[item.id] === 'string' ? [data[item.id]] : data[item.id]
 
      correct = (answer || []).map(k => rightAnswer[item.id].indexOf(k) >= 0).every(v => !!v) &&
        (rightAnswer[item.id].map(k => (answer || []).indexOf(k) >= 0).every(v => !!v))
    } else {
      correct = _.includes(rightAnswer[item.id], data[item.id])
    }
    
    if (correct) {
      message = _.get(meta, `successes[${item.id}]`) || RIGHT_ANSWER
    } else {
      message = _.get(meta, `errors[${item.id}]`) || WRONG_ANSWER
      error = true
    }
    if (!!message) {
      messages = {
        ...messages,
        [item.id]: {
          message,
          error,
        },
      }
    }
  })

  return messages
}

function validateOpenData(quiz, data) {
  const meta = quiz.data.meta
  const rightAnswer = meta.rightAnswer

  if (!data) {
    return {}
  }
  
  let correct = false
    
  if (meta.regex) {
    try {
      let re = new RegExp(rightAnswer)
      correct = !!re.exec(data.trim().toLowerCase())
    } catch (err) {
      // errored, already false
    } 
  } else {
    correct = data.trim().toLowerCase() === rightAnswer.trim().toLowerCase()
  }
  
  if (correct) {
    return {
      message: _.get(meta, `success`) || RIGHT_ANSWER,
      error: false,
    }
  } else {
    return {
      message: _.get(meta, `error`) || WRONG_ANSWER,
      error: true,
    }
  }
}

function validateMultipleChoiceData(quiz, data) {
  const meta = quiz.data.meta
  const rightAnswers = meta.rightAnswer
  const optionId = data
  const correct = rightAnswers.some(o => o === optionId)

  if (correct) {
    return {
      message: _.get(meta, `successes[${optionId}]`) || RIGHT_ANSWER,
      error: false,
    }
  } else {
    return {
      message: _.get(meta, `errors[${optionId}]`) || WRONG_ANSWER,
      error: true,
    }
  }
}

function validateMultipleOpenData(quiz, data) {
  const { meta, items } = quiz.data
  const rightAnswers = meta.rightAnswer

  let messages = {}

  items.map(item => {
    let message = ''
    let error = false

    let correct = false

    if (meta.regex) {
      try {
        let re = new RegExp((rightAnswers[item.id] || ''))
        correct = !!re.exec((data[item.id] || '').trim().toLowerCase())
      } catch (err) {
        // errored, already false
      }
    } else {
      correct = (rightAnswers[item.id] || '').toLowerCase().trim() ===
                (data[item.id] || '').toLowerCase().trim()
    }
    
    if (correct) {
      message = _.get(meta, `successes[${item.id}]`) || RIGHT_ANSWER
    } else {
      message = _.get(meta, `errors[${item.id}]`) || WRONG_ANSWER
      error = true
    }

    messages[item.id] = {
      message,
      error,
    }
  })

  return messages
}

function validateProgress(progress) {
  // TODO: better way to toggle ignore between alternatives
  let totalPoints = 0
  let totalMaxPoints = 0
  let totalCompletedMaxPoints = 0
  let totalNormalizedPoints = 0

  let answered = []
  let notAnswered = []
  let rejected = []
  let ignored = []

  progress.answered && progress.answered.forEach(entry => {
    const validatedAnswer = validateAnswer(entry/*, ignoreList*/)
    
    if (!_.includes(entry.quiz.tags, 'ignore')) {
/*     if (!_.includes(ignoreList, entry.quiz._id.toString())) { */
      totalPoints += validatedAnswer.validation.points
      totalMaxPoints += validatedAnswer.validation.maxPoints
      totalCompletedMaxPoints += validatedAnswer.validation.maxPoints
      totalNormalizedPoints += validatedAnswer.validation.normalizedPoints
    } else {
      ignored.push(entry.quiz._id.toString())
    }

    answered.push(validatedAnswer)
  })
  
  progress.notAnswered && progress.notAnswered.map(entry => {
    const { quiz, peerReviews } = entry
    const { items } = quiz.data

    let maxPoints = 0

    if (!_.includes(entry.quiz.tags, 'ignore')) {
      if (~[quizTypes.RADIO_MATRIX, quizTypes.MULTIPLE_OPEN].indexOf(quiz.type)) {
        maxPoints = items.length
      } else {
        maxPoints = 1
      }
    } else {
      ignored.push(entry.quiz._id.toString())
    }
    
    totalMaxPoints += maxPoints

    notAnswered.push({
      quiz,
      peerReviews,
      validation: {
        maxPoints
      }
    })
  })

  progress.rejected && progress.rejected.map(entry => {
    const { quiz, answer, peerReviews } = entry
    const { items } = quiz.data

    let maxPoints = 0

    if (!_.includes(entry.quiz.tags, 'ignore')) {
      if (~[quizTypes.RADIO_MATRIX, quizTypes.MULTIPLE_OPEN].indexOf(quiz.type)) {
        maxPoints = items.length
      } else {
        maxPoints = 1
      }
    } else {
      ignored.push(entry.quiz._id.toString())
    }

    totalMaxPoints += maxPoints

    rejected.push({
      quiz,
      answer,
      peerReviews,
      validation: {
        points: 0,
        maxPoints,
        normalizedPoints: 0
      }
    })
  })

  // this looks terrrrible

  const maxNormalizedPoints = 
    (progress.answered || []).length + 
    (progress.notAnswered || []).length +
    (progress.rejected || []).length
    - ignored.length 
  const maxCompletedNormalizedPoints = 
    (progress.answered || []).length 
    - _.intersection((progress.answered || []).map(entry => entry.quiz._id.toString()), ignored).length
  const confirmedAmount = 
    (progress.answered || []).filter(entry => { 
      return entry.answer[0].confirmed && !_.includes(entry.quiz.tags, 'ignore')  
    }).length
  const confirmedIgnoredAmount = 
    (progress.answered || []).filter(entry => { 
      return entry.answer[0].confirmed && _.includes(entry.quiz.tags, 'ignore')  
    }).length
  const ignoredAmount = ignored.length
  const score = maxNormalizedPoints > 0 ? precise_round(totalNormalizedPoints / maxNormalizedPoints * 100, 2) : 0
  const pointsPercentage = totalMaxPoints > 0 ? precise_round(totalPoints / totalMaxPoints * 100, 2) : 0
  
  const progressWithValidation = {
    answered,
    notAnswered,
    rejected,
    validation: {
      points: totalPoints,
      maxPoints: totalMaxPoints,
      maxCompletedPoints: totalCompletedMaxPoints,
      confirmedAmount,
      ignoredAmount,
      confirmedIgnoredAmount,
      normalizedPoints: precise_round(totalNormalizedPoints, 2),
      maxNormalizedPoints,
      maxCompletedNormalizedPoints,
      score,
      pointsPercentage,
      progress: precise_round(confirmedAmount / maxNormalizedPoints * 100, 2),
    }
  }

  return progressWithValidation
}

module.exports = { validateAnswer, validateProgress }