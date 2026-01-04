
import React from 'react';
import Card from './Card';

interface ChatHelpProps {
    t: (key: string) => string;
}

const ChatHelp: React.FC<ChatHelpProps> = ({ t }) => {
    return (
        <div className="max-w-4xl mx-auto">
            <Card title={t('chatHelp.title')}>
                <div className="flex flex-col h-[60vh] bg-white rounded-lg">
                    <div className="flex-grow p-4 bg-gray-50 rounded-lg overflow-y-auto">
                        <div className="flex justify-start mb-4">
                            <div className="bg-gray-200 rounded-lg p-3 max-w-xs">
                                <p className="text-sm text-gray-800">Hello! I'm the Zenith POS assistant. How can I help you today?</p>
                            </div>
                        </div>
                         <div className="flex justify-start mb-4">
                            <div className="bg-gray-200 rounded-lg p-3 max-w-xs">
                                <p className="text-sm text-gray-800">You can ask me about setting up your inventory, processing a sale, or managing staff commissions.</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <input type="text" placeholder="Type your message..." className="flex-grow p-3 bg-white border border-gray-300 rounded-l-lg shadow-sm text-gray-800 placeholder-gray-400 transition-colors duration-200" />
                        <button className="bg-primary text-white px-6 py-3 rounded-r-lg font-semibold hover:bg-primary-700 transition-colors">Send</button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ChatHelp;