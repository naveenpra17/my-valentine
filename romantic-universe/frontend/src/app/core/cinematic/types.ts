export type ExperienceAct =
  | 'void'
  | 'universe'
  | 'her'
  | 'memories'
  | 'feel'
  | 'play'
  | 'intimacy'
  | 'hidden'
  | 'letter'
  | 'finale';

export type TransitionType =
  | 'fade-dark'
  | 'fade-light'
  | 'blur'
  | 'zoom-in'
  | 'zoom-out'
  | 'dissolve'
  | 'light-sweep';

export interface SceneDefinition {
  id: string;
  act: ExperienceAct;
  label: string;
}
