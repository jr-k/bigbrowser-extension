declare module 'uri-template-router' {
	export interface Route {
		uriTemplate: string;
		matchValue: any;
		options: object;
	}

	export interface Result {
		matchValue: any;
		params: {[key: string]: any} | undefined;
		uri: string;
		uriTemplate: string;
		route: Route;
		router: Router;
	}

	export class Router {
		constructor();
		addTemplate(pattern: string, options: object, matchValue: any): Route;
		resolveURI(uri: string, flags?: object): Result | null | undefined;
	}
}
