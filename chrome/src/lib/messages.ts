import {EngineStatus, IndexState} from './types';

export type Message = {type: 'refresh-index'} | {type: 'apply'} | {type: 'status'};

export interface StatusResponse {
	engine: EngineStatus;
	index: IndexState;
	version: string;
}
