const Models = require('../../../models');
const express = require('express');
const joi = require('joi');
const { Op, Model } = require('sequelize')

/**
 * @param {express.Request} req 
 * @param {express.Response} res 
 * @param {any} next 
 */
async function get(req, res, next) {
    if (!req.params.id.match(/^\d+$/)) return next();

    const profile = await Models.Profile.findOne({
        where: {
            id: req.params.id
        },
        include: [Models.Personality]
    });
    if (profile === null)
        return res.status(404).send_object({'error': 'not found'});
    return res.send_object(profile.dataValues);
}


/**
 * @param {express.Request} req 
 * @param {express.Response} res 
 * @param {any} next 
 */
async function update(req, res, next) {
    const schema = joi.object({
        id: joi.any().forbidden(),
        createdAt: joi.any().forbidden(),
        updatedAt: joi.any().forbidden(),
        UserId: joi.any().forbidden(),
        PersonalityId: joi.any().forbidden(),
        
        // this is stored in another table; would be a pain in the ass to update both at the same time
        Personality: joi.any().forbidden(),

        name: joi.string(),
        gender: joi.string(),
        birthday: joi.number(),
        about: joi.string(),
        phone: joi.string(),
        email: joi.string(),
        telegram: joi.string(),
        discord: joi.string(),
        city: joi.string()
    });

    const validated = schema.validate(req.body);
    if (validated.error) {
        return res.status(400).send_object({'error': 'bad validation', 'description': validated.error.message});
    }
    
    const authdata = req.token;
    /** @type {Models.User} */
    const user = authdata.User;

    // https://gist.github.com/ajLapid718/ca67efc0360c617e5eebb6f1342ae53e#:~:text=the%20hasmany()%20method%20provides%20the%20following%20methods
    /** @type {Models.Profile} */
    const profile = await user.getProfile();

    Object.keys(req.body).forEach(key => {
        profile[key] = req.body[key];
    });
    profile.save();

    return res.send_object(profile.dataValues);
}

/**
 * @param {express.Request} req 
 * @param {express.Response} res 
 * @param {any} next 
 */
async function upd_person(req, res, next) {

    const schema = joi.object({
        data: joi.array().items(joi.number().required()).min(12).max(12).required()
    });
    const validated = schema.validate(req.body);
    if (validated.error) {
        return res.status(400).send({'error': 'bad validation', 'description': validated.error.message});
    }

    const personality = await (await req.token.User.getProfile({include: Models.Personality})).Personality;
    personality.responses = validated.value.data;
    personality.save();
    return res.send_object(personality);
}

async function upd_traits(req, res) {
    const schema = joi.object({
        type: joi.number().min(0).max(2),
        traits: joi.array()
    });
    const validated = schema.validate(req.body);
    if (validated.error) {
        return res.status(400).send({'error': 'bad validation', 'description': validated.error.message})
    }

    const profile = await req.token.User.getProfile();

    if (req.body.type == 0) {
        profile.characteristics = req.body.traits;
    } else if (req.body.type == 1) {
        profile.nb_traits = req.body.traits;
    } else if (req.body.type == 2) {
        profile.unwanted_nb_traits = req.body.traits;
    }
    profile.save();

    return res.send_object(profile);
}

async function compatible(req, res) {
    const schema = joi.object({
        page: joi.number()
    })
    const validated = schema.validate(req.body);
    if (validated.error) {
        return res.status(400).send({'error': 'bad validation', 'description': validated.error.message});
    }

    const rangesUser = {}
    const userPersonality = await (await req.token.User.getProfile({include: Models.Personality})).Personality;
    for (i in userPersonality["responses"]) {
        if (userPersonality["responses"][i] < 3) {
            rangesUser[i] = 1;
        } else if (userPersonality["responses"][i] == 3) {
            rangesUser[i] = 2;
        } else if (userPersonality["responses"][i] > 3) {
            rangesUser[i] = 3;
        }
    }

    const profiles = [];
    const usersPersonalities = await Models.Personality.findAll({
        where: {
            [Op.not]: {id: userPersonality.id}
        }
    })
    let number = 0;
    for (userPers of usersPersonalities) {
        let coincidence = 0
        for (userResponse in userPers['responses']) {
            switch (rangesUser[userResponse]) {
                case 1:
                    if (userPers['responses'][userResponse] < 3) {
                        coincidence += 1;
                    } 
                    break;
                case 2:
                    if (userPers['responses'][userResponse] == 3) {
                        coincidence += 1
                    } 
                    break;
                case 3:
                    if (userPers['responses'][userResponse] > 3) {
                        coincidence += 1
                    } 
                    break;
            }
        }

        let matchPercentage = coincidence / 12;
        if (matchPercentage > 0.30) {
            let userProfile = await Models.Profile.findOne({
                where: {
                    id: userPers.ProfileId
                }
            });
            userProfile.dataValues.matchPercentage = matchPercentage;
            profiles.push(userProfile);
            number += 1;
        }
    }

    const data = [];
    const lastIndexPage = req.body.page * 10;
    for (let index = lastIndexPage - 10; index < lastIndexPage; index++){
        data.push(profiles[index]);
    }

    return res.send_object({data: data, items: number});
}


/**
 * @param {express.IRouter} router 
 */
module.exports = (router) => {
    const profiles = express.Router();

    profiles.get('/:id', get);

    // authorized routes
    const authorized = express.Router();

    // auth middleware
    authorized.use(require('../../middleware/optional/auth')({ optional: false, match: /^\/api\/v3\/profile\/(update_(data|personality|traits)|compatible)$/gm }));
    authorized.post('/update_data', update);
    authorized.post('/update_personality', upd_person);
    authorized.post('/update_traits', upd_traits);
    authorized.post('/compatible', compatible);
    profiles.use(authorized);

    router.use('/profile', profiles);
}