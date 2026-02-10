import { headers } from 'next/headers';

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    metadata?: Record<string, any>;
    url?: string;
    userAgent?: string;
}

class Logger {
    private log(level: LogLevel, message: string, metadata?: Record<string, any>) {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            metadata,
        };

        // In a real app, you might send this to a service like Datadog, Sentry, or CloudWatch.
        // For now, we print structured JSON to stdout.
        console.log(JSON.stringify(entry));
    }

    info(message: string, metadata?: Record<string, any>) {
        this.log('info', message, metadata);
    }

    warn(message: string, metadata?: Record<string, any>) {
        this.log('warn', message, metadata);
    }

    error(message: string, metadata?: Record<string, any>) {
        this.log('error', message, metadata);
    }
}

export const logger = new Logger();
