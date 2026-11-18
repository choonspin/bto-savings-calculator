import { addMonths, isMonthKey } from './months.js';

/** Corduroy colours a person can pick for their card and bunny. */
export const COLORS = ['pink', 'peach', 'butter', 'mint', 'blue', 'lilac'];

const MAX_NAME_LENGTH = 20;
const MAX_TRIP_NAME_LENGTH = 40;

/** The example numbers a new visitor starts from. `today` is a 'YYYY-MM' key. */
export function examplePlan(today) {
  return {
    couple: true,
    people: [
      { name: 'Me', color: 'pink', gross: 4500, saving: 1500, startsWork: today },
      { name: 'Partner', color: 'blue', gross: 5000, saving: 1500, startsWork: today },
    ],
    savedCash: 10000,
    savedOA: 15000,
    flat: { price: 550000, keys: addMonths(today, 36), reno: 60000, rent: 0 },
    trips: [],
  };
}

/**
 * Builds a complete, valid plan from saved or shared data. Anything missing or malformed
 * falls back to the example plan, so the page never has to check fields itself.
 */
export function normalizePlan(raw, today) {
  const example = examplePlan(today);
  const source = isObject(raw) ? raw : {};
  const flat = isObject(source.flat) ? source.flat : {};
  const people = Array.isArray(source.people) ? source.people : [];

  return {
    couple: typeof source.couple === 'boolean' ? source.couple : example.couple,
    people: example.people.map((fallback, i) => normalizePerson(people[i], fallback)),
    savedCash: amount(source.savedCash, example.savedCash),
    savedOA: amount(source.savedOA, example.savedOA),
    flat: {
      price: amount(flat.price, example.flat.price),
      keys: isMonthKey(flat.keys) ? flat.keys : example.flat.keys,
      reno: amount(flat.reno, example.flat.reno),
      rent: amount(flat.rent, example.flat.rent),
    },
    trips: Array.isArray(source.trips) ? source.trips.filter(isTrip).map(normalizeTrip) : [],
  };
}

export function newTripId() {
  return `trip-${Math.random().toString(36).slice(2, 10)}`;
}

/** A person's name as shown on the page, even when they've cleared it. */
export function displayName(name, index) {
  return name.trim() || (index === 0 ? 'Me' : 'Partner');
}

const POSSESSIVE_PRONOUNS = { me: 'My', you: 'Your', her: 'Her', him: 'His', us: 'Our' };

/** 'My', 'Her', "Wei's": names can be pronouns, so "Me's share" reads as "My share". */
export function possessive(name) {
  return POSSESSIVE_PRONOUNS[name.toLowerCase()] ?? `${name}'s`;
}

/** Reads a field by its dotted path, such as 'people.0.gross'. */
export function getField(plan, path) {
  return path.split('.').reduce((value, key) => value?.[key], plan);
}

/** Writes a field by its dotted path, such as 'flat.keys'. */
export function setField(plan, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((value, key) => value[key], plan)[last] = value;
}

function normalizePerson(raw, fallback) {
  const person = isObject(raw) ? raw : {};
  return {
    name: typeof person.name === 'string' ? person.name.slice(0, MAX_NAME_LENGTH) : fallback.name,
    color: COLORS.includes(person.color) ? person.color : fallback.color,
    gross: amount(person.gross, fallback.gross),
    saving: amount(person.saving, fallback.saving),
    startsWork: isMonthKey(person.startsWork) ? person.startsWork : fallback.startsWork,
  };
}

function isTrip(trip) {
  return isObject(trip) && typeof trip.name === 'string' && trip.name.trim() !== '' && isMonthKey(trip.month);
}

function normalizeTrip(trip) {
  return {
    id: typeof trip.id === 'string' && trip.id !== '' ? trip.id : newTripId(),
    name: trip.name.slice(0, MAX_TRIP_NAME_LENGTH),
    month: trip.month,
    budget: amount(trip.budget, 0),
  };
}

function amount(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
