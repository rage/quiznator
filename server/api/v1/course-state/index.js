const router = require('express').Router()

const authenticationMiddlewares = require('app-modules/middlewares/authentication');
const middlewares = require('./middlewares')
const TMCMiddlewares = require('app-modules/middlewares/tmc')

router.post('/state/:courseid',
  TMCMiddlewares.getProfile(),
  middlewares.getCourseState({
    getAnswererId: req => req.TMCProfile.username,
    getCourseId: req => req.params.courseid,
    getAllInfo: () => true,
    getBody: req => req.body
  }),
  (req, res, next) => {
    res.json(req.state)
  }
)

router.get('/completed',
  authenticationMiddlewares.authorize(),
  middlewares.getCompleted({
    getCourseIds: req => req.query.courseIds
  }),
  (req, res, next) => {
    res.json(req.answererIds)
  }
)

router.post('/all/:courseid',
  authenticationMiddlewares.authorize(),
  middlewares.getCourseState({
    getAnswererId: () => undefined,
    getCourseId: req => req.params.courseid,
    getAllInfo: req => req.query.allInfo,
    getBody: req => req.body
  }),
  (req, res, next) => {
    res.json(req.state)
  }
)

router.post('/stateanswer',
  authenticationMiddlewares.authorize(),
  middlewares.updateCourseStateAnswer({
    getBody: req => req.body
  }),
  (req, res, next) => {
    res.json(req.answerValidation)
  }
)

router.post('/distribution',
  authenticationMiddlewares.authorize(),
  middlewares.getDistribution({
    getQuizId: req => req.body.quizId
  }),
  (req, res, next) => {
    res.json(req.distribution)
  }
)

router.get('/stats',
  authenticationMiddlewares.authorize(),
  middlewares.getStats({
    getCourseId: req => req.query.courseId
  }),
  (req, res, next) => {
    res.json(req.stats)
  }
)

module.exports = router