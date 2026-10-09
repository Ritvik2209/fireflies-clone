"""The LLM integration (bonus 6), kept apart from the rest of the app.

`client` is the only module that knows the SDK and the provider; `prompts` builds what is sent.
Neither touches the database, so switching provider (or faking it in tests) is local.
"""
