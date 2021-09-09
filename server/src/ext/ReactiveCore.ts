import { Subject, Observable, combineLatest } from 'rxjs'
import { first } from 'rxjs/operators';

export class ReactiveCore {

    streams: any[] = [];

    socketio: any;

    publish(streamName: string, data: any) {
        const stream$ = this.getStream(streamName);
        stream$.next(data);
    }

    createStream<T>(streamName: string) {
        const subjectStream$ = new Subject<T>();
        this.streams.push({
            stream: subjectStream$,
            id: streamName
        });
        return subjectStream$;
    }

    getStream<T>(streamName: string): Subject<T> {
        const stream = this.streams.find(stream => stream.id === streamName);
        if (stream) {
            return stream.stream;
        }
        return this.createStream(streamName);
    }

    getStreams<T>(streams: string[]): Subject<T>[] {
        return streams.map(id => this.getStream(id));
    }

    subscribeOnce(stream: string, action: (data: any) => void) {
        const stream$ = this.getStream(stream);
        stream$
            .pipe(first())
            .subscribe(action)
    }

    subscribe(stream: string, action: (data: any) => void) {
        const stream$ = this.getStream(stream);
        stream$.subscribe(action)
    }

    connectSocket(socketio) {
        this.socketio = socketio;
    }

    exposeOnSocket(streamName: string) {
        this.subscribe(streamName, (data) => {
            this.socketio.emit(streamName, data);
        })
    }

    readFromSocket(streamName: string) {
        this.socketio.on(streamName, (msg) => {
            const stream$ = this.getStream(streamName);
            stream$.next(msg);
        });
    }
}

type Action = (input: any) => Promise<any>;

export class ReactiveCoreModule {

    static create(id: string) {
        return new ReactiveCoreModule(id);
    }

    private registry: ReactiveCore;

    private outStreams: Subject<any>[] = [];

    private action: Action;

    constructor(id: string) {

    }

    setRegistry(registry: ReactiveCore) {
        this.registry = registry;
    }

    combineTriggers(...triggers: string[]) {
        const streams$ = this.registry.getStreams(triggers);
        const combined$ = combineLatest(streams$);
        this.subscribe(combined$);
        return this;
    }

    withTrigger(trigger: string) {
        const stream$ = this.registry.getStream(trigger);
        this.subscribe(stream$);
        return this;
    }

    withOutput(...triggers: string[]) {
        this.outStreams = triggers.map(id => this.registry.getStream(id));
        return this;
    }

    execute(action: Action) {
        this.action = action;
        return this;
    }

    wire(registry: ReactiveCore) {
        this.setRegistry(registry);
        return this;
    }

    private subscribe(stream$: Observable<any>) {
        stream$.subscribe(async (data) => {
            const result = await this.action(data);
            this.publish(result);
        });
    }

    private publish(data: any) {
        this.outStreams.forEach(stream => {
            stream.next(data);
        })
    }

}


