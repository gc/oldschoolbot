import { KlasaUser } from 'klasa';
import { O } from 'ts-toolbelt';

import { KillableMonster } from '../types';
import { GearStats } from '../../gear/types';
import { calcWhatPercent, reduceNumByPercent } from '../../util';
import { maxDefenceStats, maxOffenceStats } from '../../gear/data/maxGearStats';
import readableStatName from '../../gear/functions/readableStatName';
import { inverseOfOffenceStat } from '../../gear/functions/inverseOfStat';

const { floor, max } = Math;

export default function calculateMonsterFood(
	monster: O.Readonly<KillableMonster>,
	user: O.Readonly<KlasaUser>
): [number, string[]] {
	const messages: string[] = [];
	let { healAmountNeeded, attackStyleToUse, attackStylesUsed, minimumGearRequirements } = monster;

	if (!healAmountNeeded || !attackStyleToUse || !attackStylesUsed) {
		return [0, messages];
	}

	messages.push(`${monster.name} needs ${healAmountNeeded}HP worth of food per kill.`);

	const gearStats = user.setupStats(attackStyleToUse);
	const keys = Object.keys(gearStats) as (keyof GearStats)[];
	for (const key of keys) {
		const required = minimumGearRequirements?.[key];
		if (!required) continue;
		const has = gearStats[key];
		if (has < required) {
			throw `You don't have the requirements to kill ${monster.name}! Your ${readableStatName(
				key
			)} stat in your ${attackStyleToUse} setup is ${has}, but you need atleast ${required}.`;
		}
	}

	let totalPercentOfGearLevel = 0;
	let totalOffensivePercent = 0;
	for (const style of attackStylesUsed) {
		const inverseStyle = inverseOfOffenceStat(style);
		const usersStyle = gearStats[inverseStyle];
		const maxStyle = maxDefenceStats[inverseStyle]!;
		const percent = floor(calcWhatPercent(usersStyle, maxStyle));
		messages.push(
			`Your ${inverseStyle} bonus is ${percent}% of the best (${usersStyle} out of ${maxStyle})`
		);
		totalPercentOfGearLevel += percent;

		totalOffensivePercent += floor(calcWhatPercent(gearStats[style], maxOffenceStats[style]));
	}

	totalPercentOfGearLevel = Math.min(
		floor(max(0, totalPercentOfGearLevel / attackStylesUsed.length)),
		85
	);
	totalOffensivePercent = floor(max(0, totalOffensivePercent / attackStylesUsed.length)) / 2;

	messages.push(
		`You use ${floor(totalPercentOfGearLevel)}% less food because of your defensive stats.`
	);
	healAmountNeeded = floor(reduceNumByPercent(healAmountNeeded, totalPercentOfGearLevel));
	messages.push(
		`You use ${floor(totalOffensivePercent)}% less food because of your offensive stats.`
	);
	healAmountNeeded = floor(reduceNumByPercent(healAmountNeeded, totalOffensivePercent));

	messages.push(
		`You use ${100 -
			calcWhatPercent(
				healAmountNeeded,
				monster.healAmountNeeded!
			)}% less food (${healAmountNeeded} instead of ${
			monster.healAmountNeeded
		}) because of your gear`
	);

	return [healAmountNeeded, messages];
}
