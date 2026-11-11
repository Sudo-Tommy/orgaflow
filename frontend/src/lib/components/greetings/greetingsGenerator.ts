import { HOLIDAY_PHRASES, TIME_PHRASES, WEEKDAY_PHRASES } from "./greetingsPhrases";

export interface GreetingResult {
    greeting: string;
    subGreeting: string;
    emoji: string;
}

function getRandomItem(arr: string[]): string {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function generateGreetingInfo(): GreetingResult {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const month = now.getMonth() + 1;
    const date = now.getDate();

    if (month === 12 && date >= 24 && date <= 26) {
        const item = HOLIDAY_PHRASES.christmas;
        return { greeting: item.name, emoji: item.emoji, subGreeting: getRandomItem(item.phrases) };
    }
    if (month === 12 && date === 31) {
        const item = HOLIDAY_PHRASES.silvester;
        return { greeting: item.name, emoji: item.emoji, subGreeting: getRandomItem(item.phrases) };
    }
    if (month === 1 && date === 1) {
        const item = HOLIDAY_PHRASES.newYear;
        return { greeting: item.name, emoji: item.emoji, subGreeting: getRandomItem(item.phrases) };
    }
    if (month === 10 && date === 31) {
        const item = HOLIDAY_PHRASES.halloween;
        return { greeting: item.name, emoji: item.emoji, subGreeting: getRandomItem(item.phrases) };
    }
    if (month === 2 && date === 14) {
        const item = HOLIDAY_PHRASES.valentine;
        return { greeting: item.name, emoji: item.emoji, subGreeting: getRandomItem(item.phrases) };
    }
    if (month === 4 && date === 1) {
        const item = HOLIDAY_PHRASES.aprilFools;
        return { greeting: item.name, emoji: item.emoji, subGreeting: getRandomItem(item.phrases) };
    }
    if (month === 5 && date === 4) {
        const item = HOLIDAY_PHRASES.starWars;
        return { greeting: item.name, emoji: item.emoji, subGreeting: getRandomItem(item.phrases) };
    }

    let timeConfig = TIME_PHRASES.night;
    if (hour >= 4 && hour < 11) timeConfig = TIME_PHRASES.morning;
    else if (hour >= 11 && hour < 14) timeConfig = TIME_PHRASES.lunch;
    else if (hour >= 14 && hour < 18) timeConfig = TIME_PHRASES.afternoon;
    else if (hour >= 18 && hour < 22) timeConfig = TIME_PHRASES.evening;

    let subGreeting = getRandomItem(timeConfig.phrases);
    let emoji = timeConfig.emoji;

    if (day === 0 || day === 6) {
        emoji = "🛋️";
        if (WEEKDAY_PHRASES[day]?.length) {
            subGreeting = getRandomItem(WEEKDAY_PHRASES[day]);
        }
    } else if (day === 5 && hour >= 12) {
        emoji = "🎉";
        if (WEEKDAY_PHRASES[5]?.length) {
            subGreeting = getRandomItem(WEEKDAY_PHRASES[5]);
        }
    } else if (WEEKDAY_PHRASES[day] && Math.random() > 0.4) {
        subGreeting = getRandomItem(WEEKDAY_PHRASES[day]);
    }

    return {
        greeting: timeConfig.greeting,
        subGreeting,
        emoji
    };
}
