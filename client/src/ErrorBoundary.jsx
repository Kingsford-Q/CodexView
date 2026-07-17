import { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error('Unhandled render error:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full min-h-screen flex flex-col justify-center items-center gap-4 px-4 text-center">
                    <div className="font-bold text-xl">Something went wrong</div>
                    <p className="text-gray-600 max-w-md">
                        CodexView hit an unexpected error. Your session data is safe - reloading should fix it.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="text-white bg-[#0663cc] hover:bg-[#0552a8] rounded-full text-md px-6 py-2 font-semibold transition-colors"
                    >
                        Reload
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
