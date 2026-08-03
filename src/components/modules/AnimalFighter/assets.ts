import type { CharacterId, Pose } from './logic';
import bgIndiaUrl from '@/assets/animal-fighter/backgrounds/bg-India.png';
import bgNewYorkUrl from '@/assets/animal-fighter/backgrounds/bg-New-York.png';
import bgTajMahalUrl from '@/assets/animal-fighter/backgrounds/bg-Taj-Mahal.png';
import bgKyotoUrl from '@/assets/animal-fighter/backgrounds/bg-kyoto.png';
import bgStreetUrl from '@/assets/animal-fighter/backgrounds/bg-street-1.png';
import bisonAirDamageUrl from '@/assets/animal-fighter/bison/air-damage.png';
import bisonCrouchGuardUrl from '@/assets/animal-fighter/bison/crouch-guard.png';
import bisonCrouchUrl from '@/assets/animal-fighter/bison/crouch.png';
import bisonDownUrl from '@/assets/animal-fighter/bison/down.png';
import bisonFightUrl from '@/assets/animal-fighter/bison/fight.png';
import bisonGuardUrl from '@/assets/animal-fighter/bison/guard.png';
import bisonIconUrl from '@/assets/animal-fighter/bison/icon.png';
import bisonJumpUrl from '@/assets/animal-fighter/bison/jump.png';
import bisonKickUrl from '@/assets/animal-fighter/bison/kick.png';
import bisonPunchUrl from '@/assets/animal-fighter/bison/punch.png';
import blankaAirDamageUrl from '@/assets/animal-fighter/blanka/air-damage.png';
import blankaCrouchGuardUrl from '@/assets/animal-fighter/blanka/crouch-guard.png';
import blankaCrouchUrl from '@/assets/animal-fighter/blanka/crouch.png';
import blankaDownUrl from '@/assets/animal-fighter/blanka/down.png';
import blankaFightUrl from '@/assets/animal-fighter/blanka/fight.png';
import blankaGuardUrl from '@/assets/animal-fighter/blanka/guard.png';
import blankaIconUrl from '@/assets/animal-fighter/blanka/icon.png';
import blankaJumpUrl from '@/assets/animal-fighter/blanka/jump.png';
import blankaKickUrl from '@/assets/animal-fighter/blanka/kick.png';
import blankaPunchUrl from '@/assets/animal-fighter/blanka/punch.png';
import chunliAirDamageUrl from '@/assets/animal-fighter/chunli/air-damage.png';
import chunliCrouchGuardUrl from '@/assets/animal-fighter/chunli/crouch-guard.png';
import chunliCrouchUrl from '@/assets/animal-fighter/chunli/crouch.png';
import chunliDownUrl from '@/assets/animal-fighter/chunli/down.png';
import chunliFightUrl from '@/assets/animal-fighter/chunli/fight.png';
import chunliGuardUrl from '@/assets/animal-fighter/chunli/guard.png';
import chunliIconUrl from '@/assets/animal-fighter/chunli/icon.png';
import chunliJumpUrl from '@/assets/animal-fighter/chunli/jump.png';
import chunliKickUrl from '@/assets/animal-fighter/chunli/kick.png';
import chunliPunchUrl from '@/assets/animal-fighter/chunli/punch.png';
import chunliSbk1Url from '@/assets/animal-fighter/chunli/spinning-bird-kick/spinning-bird-kick-1.png';
import chunliSbk2Url from '@/assets/animal-fighter/chunli/spinning-bird-kick/spinning-bird-kick-2.png';
import chunliSbk3Url from '@/assets/animal-fighter/chunli/spinning-bird-kick/spinning-bird-kick-3.png';
import chunliSbk4Url from '@/assets/animal-fighter/chunli/spinning-bird-kick/spinning-bird-kick-4.png';
import dhalsimAirDamageUrl from '@/assets/animal-fighter/dhalsim/air-damage.png';
import dhalsimCrouchGuardUrl from '@/assets/animal-fighter/dhalsim/crouch-guard.png';
import dhalsimCrouchUrl from '@/assets/animal-fighter/dhalsim/crouch.png';
import dhalsimDownUrl from '@/assets/animal-fighter/dhalsim/down.png';
import dhalsimFightUrl from '@/assets/animal-fighter/dhalsim/fight.png';
import dhalsimGuardUrl from '@/assets/animal-fighter/dhalsim/guard.png';
import dhalsimIconUrl from '@/assets/animal-fighter/dhalsim/icon.png';
import dhalsimJumpUrl from '@/assets/animal-fighter/dhalsim/jump.png';
import dhalsimKickUrl from '@/assets/animal-fighter/dhalsim/kick.png';
import dhalsimPunchUrl from '@/assets/animal-fighter/dhalsim/punch.png';
import dhalsimYoga1Url from '@/assets/animal-fighter/dhalsim/yoga-fire/yoga-fire-1.png';
import dhalsimYoga2Url from '@/assets/animal-fighter/dhalsim/yoga-fire/yoga-fire-2.png';
import dhalsimYoga3Url from '@/assets/animal-fighter/dhalsim/yoga-fire/yoga-fire-3.png';
import dhalsimYoga4Url from '@/assets/animal-fighter/dhalsim/yoga-fire/yoga-fire-4.png';
import guileAirDamageUrl from '@/assets/animal-fighter/guile/air-damage.png';
import guileCrouchGuardUrl from '@/assets/animal-fighter/guile/crouch-guard.png';
import guileCrouchUrl from '@/assets/animal-fighter/guile/crouch.png';
import guileDownUrl from '@/assets/animal-fighter/guile/down.png';
import guileFightUrl from '@/assets/animal-fighter/guile/fight.png';
import guileGuardUrl from '@/assets/animal-fighter/guile/guard.png';
import guileIconUrl from '@/assets/animal-fighter/guile/icon.png';
import guileJumpUrl from '@/assets/animal-fighter/guile/jump.png';
import guileKickUrl from '@/assets/animal-fighter/guile/kick.png';
import guilePunchUrl from '@/assets/animal-fighter/guile/punch.png';
import guileSomersault1Url from '@/assets/animal-fighter/guile/somersault-kick/somersault-kick-1.png';
import guileSomersault2Url from '@/assets/animal-fighter/guile/somersault-kick/somersault-kick-2.png';
import guileSomersault3Url from '@/assets/animal-fighter/guile/somersault-kick/somersault-kick-3.png';
import guileSomersault4Url from '@/assets/animal-fighter/guile/somersault-kick/somersault-kick-4.png';
import guileSomersault5Url from '@/assets/animal-fighter/guile/somersault-kick/somersault-kick-5.png';
import hondaAirDamageUrl from '@/assets/animal-fighter/honda/air-damage.png';
import hondaCrouchGuardUrl from '@/assets/animal-fighter/honda/crouch-guard.png';
import hondaCrouchUrl from '@/assets/animal-fighter/honda/crouch.png';
import hondaDownUrl from '@/assets/animal-fighter/honda/down.png';
import hondaFightUrl from '@/assets/animal-fighter/honda/fight.png';
import hondaGuardUrl from '@/assets/animal-fighter/honda/guard.png';
import hondaIconUrl from '@/assets/animal-fighter/honda/icon.png';
import hondaJumpUrl from '@/assets/animal-fighter/honda/jump.png';
import hondaKickUrl from '@/assets/animal-fighter/honda/kick.png';
import hondaPunchUrl from '@/assets/animal-fighter/honda/punch.png';
import kenBaseUrl from '@/assets/animal-fighter/ken/base.png';
import kenAirDamageUrl from '@/assets/animal-fighter/ken/air-damage.png';
import kenCrouchGuardUrl from '@/assets/animal-fighter/ken/crouch-guard.png';
import kenCrouchUrl from '@/assets/animal-fighter/ken/crouch.png';
import kenDownUrl from '@/assets/animal-fighter/ken/down.png';
import kenFightUrl from '@/assets/animal-fighter/ken/fight.png';
import kenGuardUrl from '@/assets/animal-fighter/ken/guard.png';
import kenIconUrl from '@/assets/animal-fighter/ken/icon.png';
import kenJumpUrl from '@/assets/animal-fighter/ken/jump.png';
import kenKickUrl from '@/assets/animal-fighter/ken/kick.png';
import kenPunchUrl from '@/assets/animal-fighter/ken/punch.png';
import ryuBaseUrl from '@/assets/animal-fighter/ryu/base.png';
import ryuAirDamageUrl from '@/assets/animal-fighter/ryu/air-damage.png';
import ryuCrouchGuardUrl from '@/assets/animal-fighter/ryu/crouch-guard.png';
import ryuCrouchUrl from '@/assets/animal-fighter/ryu/crouch.png';
import ryuDownUrl from '@/assets/animal-fighter/ryu/down.png';
import ryuFightUrl from '@/assets/animal-fighter/ryu/fight.png';
import ryuGuardUrl from '@/assets/animal-fighter/ryu/guard.png';
import ryuIconUrl from '@/assets/animal-fighter/ryu/icon.png';
import ryuJumpUrl from '@/assets/animal-fighter/ryu/jump.png';
import ryuKickUrl from '@/assets/animal-fighter/ryu/kick.png';
import ryuPunchUrl from '@/assets/animal-fighter/ryu/punch.png';
import titleLogoUrl from '@/assets/animal-fighter/title-logo.png';
import vegaAirDamageUrl from '@/assets/animal-fighter/vega/air-damage.png';
import vegaCrouchGuardUrl from '@/assets/animal-fighter/vega/crouch-guard.png';
import vegaCrouchUrl from '@/assets/animal-fighter/vega/crouch.png';
import vegaDownUrl from '@/assets/animal-fighter/vega/down.png';
import vegaFightUrl from '@/assets/animal-fighter/vega/fight.png';
import vegaGuardUrl from '@/assets/animal-fighter/vega/guard.png';
import vegaIconUrl from '@/assets/animal-fighter/vega/icon.png';
import vegaJumpUrl from '@/assets/animal-fighter/vega/jump.png';
import vegaKickUrl from '@/assets/animal-fighter/vega/kick.png';
import vegaPunchUrl from '@/assets/animal-fighter/vega/punch.png';
import zangiefAirDamageUrl from '@/assets/animal-fighter/zangief/air-damage.png';
import zangiefCrouchGuardUrl from '@/assets/animal-fighter/zangief/crouch-guard.png';
import zangiefCrouchUrl from '@/assets/animal-fighter/zangief/crouch.png';
import zangiefDownUrl from '@/assets/animal-fighter/zangief/down.png';
import zangiefFightUrl from '@/assets/animal-fighter/zangief/fight.png';
import zangiefGuardUrl from '@/assets/animal-fighter/zangief/guard.png';
import zangiefIconUrl from '@/assets/animal-fighter/zangief/icon.png';
import zangiefJumpUrl from '@/assets/animal-fighter/zangief/jump.png';
import zangiefKickUrl from '@/assets/animal-fighter/zangief/kick.png';
import zangiefPunchUrl from '@/assets/animal-fighter/zangief/punch.png';

export const spriteUrls: Record<CharacterId, Record<Pose, string>> = {
  ryu: {
    base: ryuBaseUrl,
    icon: ryuIconUrl,
    fight: ryuFightUrl,
    punch: ryuPunchUrl,
    kick: ryuKickUrl,
    guard: ryuGuardUrl,
    crouchGuard: ryuCrouchGuardUrl,
    airDamage: ryuAirDamageUrl,
    jump: ryuJumpUrl,
    crouch: ryuCrouchUrl,
    down: ryuDownUrl
  },
  ken: {
    base: kenBaseUrl,
    icon: kenIconUrl,
    fight: kenFightUrl,
    punch: kenPunchUrl,
    kick: kenKickUrl,
    guard: kenGuardUrl,
    crouchGuard: kenCrouchGuardUrl,
    airDamage: kenAirDamageUrl,
    jump: kenJumpUrl,
    crouch: kenCrouchUrl,
    down: kenDownUrl
  },
  chunli: {
    base: chunliFightUrl,
    icon: chunliIconUrl,
    fight: chunliFightUrl,
    punch: chunliPunchUrl,
    kick: chunliKickUrl,
    guard: chunliGuardUrl,
    crouchGuard: chunliCrouchGuardUrl,
    airDamage: chunliAirDamageUrl,
    jump: chunliJumpUrl,
    crouch: chunliCrouchUrl,
    down: chunliDownUrl
  },
  honda: {
    base: hondaFightUrl,
    icon: hondaIconUrl,
    fight: hondaFightUrl,
    punch: hondaPunchUrl,
    kick: hondaKickUrl,
    guard: hondaGuardUrl,
    crouchGuard: hondaCrouchGuardUrl,
    airDamage: hondaAirDamageUrl,
    jump: hondaJumpUrl,
    crouch: hondaCrouchUrl,
    down: hondaDownUrl
  },
  zangief: {
    base: zangiefFightUrl,
    icon: zangiefIconUrl,
    fight: zangiefFightUrl,
    punch: zangiefPunchUrl,
    kick: zangiefKickUrl,
    guard: zangiefGuardUrl,
    crouchGuard: zangiefCrouchGuardUrl,
    airDamage: zangiefAirDamageUrl,
    jump: zangiefJumpUrl,
    crouch: zangiefCrouchUrl,
    down: zangiefDownUrl
  },
  guile: {
    base: guileFightUrl,
    icon: guileIconUrl,
    fight: guileFightUrl,
    punch: guilePunchUrl,
    kick: guileKickUrl,
    guard: guileGuardUrl,
    crouchGuard: guileCrouchGuardUrl,
    airDamage: guileAirDamageUrl,
    jump: guileJumpUrl,
    crouch: guileCrouchUrl,
    down: guileDownUrl
  },
  dhalsim: {
    base: dhalsimFightUrl,
    icon: dhalsimIconUrl,
    fight: dhalsimFightUrl,
    punch: dhalsimPunchUrl,
    kick: dhalsimKickUrl,
    guard: dhalsimGuardUrl,
    crouchGuard: dhalsimCrouchGuardUrl,
    airDamage: dhalsimAirDamageUrl,
    jump: dhalsimJumpUrl,
    crouch: dhalsimCrouchUrl,
    down: dhalsimDownUrl
  },
  bison: {
    base: bisonFightUrl,
    icon: bisonIconUrl,
    fight: bisonFightUrl,
    punch: bisonPunchUrl,
    kick: bisonKickUrl,
    guard: bisonGuardUrl,
    crouchGuard: bisonCrouchGuardUrl,
    airDamage: bisonAirDamageUrl,
    jump: bisonJumpUrl,
    crouch: bisonCrouchUrl,
    down: bisonDownUrl
  },
  blanka: {
    base: blankaFightUrl,
    icon: blankaIconUrl,
    fight: blankaFightUrl,
    punch: blankaPunchUrl,
    kick: blankaKickUrl,
    guard: blankaGuardUrl,
    crouchGuard: blankaCrouchGuardUrl,
    airDamage: blankaAirDamageUrl,
    jump: blankaJumpUrl,
    crouch: blankaCrouchUrl,
    down: blankaDownUrl
  },
  vega: {
    base: vegaFightUrl,
    icon: vegaIconUrl,
    fight: vegaFightUrl,
    punch: vegaPunchUrl,
    kick: vegaKickUrl,
    guard: vegaGuardUrl,
    crouchGuard: vegaCrouchGuardUrl,
    airDamage: vegaAirDamageUrl,
    jump: vegaJumpUrl,
    crouch: vegaCrouchUrl,
    down: vegaDownUrl
  }
};

// キャラ固有の必殺技アニメ。spriteUrls は全キャラ必須の Record なのでここに分ける。
// キーは技ID、値は表示順のフレーム画像
export const specialSpriteUrls: Partial<
  Record<CharacterId, Record<string, readonly string[]>>
> = {
  chunli: {
    spinningBirdKick: [
      chunliSbk1Url,
      chunliSbk2Url,
      chunliSbk3Url,
      chunliSbk4Url
    ]
  },
  dhalsim: {
    yogaFire: [
      dhalsimYoga1Url,
      dhalsimYoga2Url,
      dhalsimYoga3Url,
      dhalsimYoga4Url
    ]
  },
  guile: {
    somersaultKick: [
      guileSomersault1Url,
      guileSomersault2Url,
      guileSomersault3Url,
      guileSomersault4Url,
      guileSomersault5Url
    ]
  }
};

export type StageDefinition = { id: string; name: string; url: string };

export const STAGE_DEFINITIONS: readonly StageDefinition[] = [
  { id: 'india', name: 'INDIA', url: bgIndiaUrl },
  { id: 'kyoto', name: 'KYOTO', url: bgKyotoUrl },
  { id: 'new-york', name: 'NEW YORK', url: bgNewYorkUrl },
  { id: 'street', name: 'STREET', url: bgStreetUrl },
  { id: 'taj-mahal', name: 'TAJ MAHAL', url: bgTajMahalUrl }
];

export const MENU_BACKGROUND_URL =
  STAGE_DEFINITIONS.find((stage) => stage.id === 'street')?.url ?? '';

export { titleLogoUrl };
