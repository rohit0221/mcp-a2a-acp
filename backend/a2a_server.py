import os
import uvicorn
from dotenv import load_dotenv
from openai import AsyncOpenAI

# A2A SDK imports
from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.utils import new_agent_text_message
from a2a.types import (
    AgentCapabilities,
    AgentCard,
    AgentSkill,
)

# Load environment variables
load_dotenv()

# Initialize ASYNC OpenAI client
api_key = os.getenv("OPENAI_API_KEY")
openai_client = AsyncOpenAI(api_key=api_key) if api_key else None

class ResearchAndDraftAgent:
    """Agent that researches a topic and drafts a markdown report."""
    
    def __init__(self, topic: str):
        self.topic = topic
    
    async def invoke(self) -> str:
        if not openai_client:
            raise ValueError("OPENAI_API_KEY not found.")
        
        # Step 1: Research (using async client)
        print(f"[Agent] Researching: {self.topic}")
        research_response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a senior researcher. Provide 4-5 key bullet points about the requested topic."},
                {"role": "user", "content": f"Research topic: {self.topic}"}
            ]
        )
        notes = research_response.choices[0].message.content
        
        # Step 2: Draft (using async client)
        print(f"[Agent] Drafting report...")
        draft_response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a technical writer. Create a markdown report based on the input."},
                {"role": "user", "content": f"Topic: {self.topic}\nNotes:\n{notes}"}
            ]
        )
        report = draft_response.choices[0].message.content
        
        print(f"[Agent] Report completed!")
        return report

class ResearchAndDraftAgentExecutor(AgentExecutor):
    """AgentExecutor for the research and draft agent."""
    
    async def execute(
        self,
        context: RequestContext,
        event_queue: EventQueue,
    ) -> None:
        # Extract topic from context.message
        topic = ""
        
        if hasattr(context, 'message') and context.message:
            print(f"[Executor] Found message with {len(context.message.parts)} parts")
            for part in context.message.parts:
                # Part is a Pydantic RootModel - access via root or model_dump()
                part_dict = part.model_dump() if hasattr(part, 'model_dump') else {}
                print(f"[Executor] Part: {part_dict}")
                
                # Extract text from the part dict
                if 'text' in part_dict and part_dict['text']:
                    topic = part_dict['text']
                    print(f"[Executor] Extracted topic: '{topic}'")
                    break
        
        if not topic:
            print(f"[Executor] ERROR: No topic found in message!")
            await event_queue.enqueue_event(new_agent_text_message("Error: No topic provided in request"))
            return
        
        try:
            agent = ResearchAndDraftAgent(topic)
            result = await agent.invoke()
            await event_queue.enqueue_event(new_agent_text_message(result))
            print(f"[Executor] Successfully enqueued result (length: {len(result)})")
        except Exception as e:
            import traceback
            traceback.print_exc()
            await event_queue.enqueue_event(new_agent_text_message(f"Error: {str(e)}"))
    
    async def cancel(
        self, context: RequestContext, event_queue: EventQueue
    ) -> None:
        raise Exception('cancel not supported')

if __name__ == '__main__':
    skill = AgentSkill(
        id='research_and_draft_report',
        name='Research and Draft',
        description='Research a topic and draft a markdown report.',
        tags=['research', 'drafting'],
        examples=['Research quantum computing', 'Write a report on AI agents'],
    )
    
    agent_card = AgentCard(
        name='protocol-native-writer',
        description='An agent that researches a topic and drafts a markdown report.',
        url='http://localhost:8000/',
        version='0.1.0',
        default_input_modes=['text'],
        default_output_modes=['text'],
        capabilities=AgentCapabilities(streaming=False),
        skills=[skill],
    )
    
    request_handler = DefaultRequestHandler(
        agent_executor=ResearchAndDraftAgentExecutor(),
        task_store=InMemoryTaskStore(),
    )
    
    server = A2AStarletteApplication(
        agent_card=agent_card,
        http_handler=request_handler,
    )
    
    print("Starting A2A Server on port 8000...")
    uvicorn.run(server.build(), host='0.0.0.0', port=8000)
