import _get from 'lodash.get'

import { 
    FETCH_PRIVACY_AGREEMENT,
    FETCH_PRIVACY_AGREEMENT_SUCCESS,
    FETCH_PRIVACY_AGREEMENT_FAIL,
    STORE_PRIVACY_AGREEMENT_LOCAL_STORAGE_KEY,
    REFRESH_PRIVACY_AGREEMENT
} from 'state/privacy-agreement';

const privacyAgreementLogic = store => next => action => {
    switch (action.type) {
        case STORE_PRIVACY_AGREEMENT_LOCAL_STORAGE_KEY:
            let accepted = false;
            if (action.payload.data) {
                accepted = action.payload.data.accepted || false
            }
            var { userId, quizId } = action
            const currentAgreement = window.localStorage.getItem('research-agreement') || '{}'
            const oldAgreement = JSON.parse(currentAgreement)
            const agreement = Object.assign(oldAgreement, { [quizId]: { ...oldAgreement[quizId], [userId]: accepted } })
            const agreementString = JSON.stringify(agreement)
            window.localStorage.setItem('research-agreement', agreementString)
            window['research-agreement'] = agreementString
            return next(Object.assign({}, action, { agreement }))
        case REFRESH_PRIVACY_AGREEMENT:
            return next(action)
        case FETCH_PRIVACY_AGREEMENT_FAIL:
            // console.log("middleware fail", action);
            return next(action);
        case FETCH_PRIVACY_AGREEMENT:
            const { privacyAgreements, quizzes } = store.getState();
            // TODO: unnecessary requests
            var { quizId, userId } = action;

            // const agreementIsBeingLoaded = !!privacyAgreements[quizId] && privacyAgreements[quizId].userId === userId;
            // const quizIsLoaded = quizzes[quizId] & quizzes[quizId].data

            return next(action);
        default:
            return next(action);
    }
}

export default privacyAgreementLogic;
