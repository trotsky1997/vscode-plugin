package com.aixcoder.jdtls.extension.core.internal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.core.runtime.OperationCanceledException;
import org.eclipse.core.runtime.ProgressMonitorWrapper;
import org.eclipse.jdt.core.CompletionProposal;
import org.eclipse.jdt.core.IBuffer;
import org.eclipse.jdt.core.ICompilationUnit;
import org.eclipse.jdt.core.JavaModelException;
import org.eclipse.jdt.core.Signature;
import org.eclipse.jdt.internal.corext.template.java.SignatureUtil;
import org.eclipse.jdt.ls.core.internal.IDelegateCommandHandler;
import org.eclipse.jdt.ls.core.internal.JDTUtils;
import org.eclipse.jdt.ls.core.internal.JavaClientConnection;
import org.eclipse.jdt.ls.core.internal.JavaLanguageServerPlugin;
import org.eclipse.jdt.ls.core.internal.contentassist.CompletionProposalRequestor;
import org.eclipse.jdt.ls.core.internal.contentassist.JavadocCompletionProposal;
import org.eclipse.jdt.ls.core.internal.contentassist.SnippetCompletionProposal;
import org.eclipse.jdt.ls.core.internal.handlers.CompletionHandler;
import org.eclipse.jdt.ls.core.internal.handlers.CompletionResponse;
import org.eclipse.jdt.ls.core.internal.handlers.CompletionResponses;
import org.eclipse.jdt.ls.core.internal.handlers.JsonRpcHelpers;
import org.eclipse.jdt.ls.core.internal.preferences.PreferenceManager;
import org.eclipse.jdt.ls.core.internal.preferences.Preferences;
import org.eclipse.lsp4j.CompletionItem;
import org.eclipse.lsp4j.CompletionParams;
import org.eclipse.lsp4j.Registration;
import org.eclipse.lsp4j.RegistrationParams;
import org.eclipse.lsp4j.Unregistration;
import org.eclipse.lsp4j.UnregistrationParams;
import org.eclipse.lsp4j.jsonrpc.json.adapters.CollectionTypeAdapter.Factory;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

public class SampleDelegateCommandHandler implements IDelegateCommandHandler {
	private static final Gson gson = (new GsonBuilder()).registerTypeAdapterFactory(new Factory()).registerTypeAdapterFactory(new org.eclipse.lsp4j.jsonrpc.json.adapters.EnumTypeAdapter.Factory()).registerTypeAdapterFactory(new org.eclipse.lsp4j.jsonrpc.json.adapters.EitherTypeAdapter.Factory()).create();

    public static final String COMMAND_ID = "com.aixcoder.jdtls.extension.completion";
    public static final String ENABLE_COMMAND_ID = "com.aixcoder.jdtls.extension.enable";

    @Override
    public Object executeCommand(String commandId, List<Object> arguments, IProgressMonitor progress) throws Exception {
        if (COMMAND_ID.equals(commandId)) {
            CompletionParams params = (CompletionParams)gson.fromJson(gson.toJson(arguments.get(0)), CompletionParams.class);
            return provideCompletionItems(params, progress);
        } else if (ENABLE_COMMAND_ID.equals(commandId)) {
        	toggleDefaultCompletion((Boolean)arguments.get(0));
        	return true;
        }
        throw new UnsupportedOperationException(String.format("Unsupported command '%s'!", commandId));
    }

    private static void toggleDefaultCompletion(boolean enabled) {
        JavaClientConnection clientConnection = JavaLanguageServerPlugin.getInstance().getClientConnection();
        if (enabled) {
            Registration registration = new Registration(Preferences.COMPLETION_ID, "textDocument/completion", CompletionHandler.DEFAULT_COMPLETION_OPTIONS);
            RegistrationParams registrationParams = new RegistrationParams(Collections.singletonList(registration));
            clientConnection.registerCapability(registrationParams);
        } else {
            Unregistration unregistration = new Unregistration(Preferences.COMPLETION_ID, "textDocument/completion");
            UnregistrationParams unregistrationParams = new UnregistrationParams(Collections.singletonList(unregistration));
            clientConnection.unregisterCapability(unregistrationParams);
        }
    }


    public List<CompletionItem> provideCompletionItems(CompletionParams position, IProgressMonitor monitor) {
        List<CompletionItem> completionItems = null;

        try {
            ICompilationUnit unit = JDTUtils.resolveCompilationUnit(position.getTextDocument().getUri());
            completionItems = this.computeContentAssist(unit, position.getPosition().getLine(), position.getPosition().getCharacter(), monitor);
        } catch (OperationCanceledException var5) {
            monitor.setCanceled(true);
        } catch (Exception var6) {
            ExtensionActivator.logException("Problem with codeComplete for " + position.getTextDocument().getUri(), var6);
            monitor.setCanceled(true);
        }

        if (monitor.isCanceled()) {
            completionItems = null;
            ExtensionActivator.logInfo("Completion request cancelled");
        } else {
            ExtensionActivator.logInfo("Completion request completed");
        }

        ExtensionActivator.logInfo(String.format("Return %d items", completionItems.size()));
        return completionItems;
    }

    private List<CompletionItem> computeContentAssist(ICompilationUnit unit, int line, int column, IProgressMonitor monitor) throws JavaModelException {
        CompletionResponses.clear();
        if (unit == null) {
            return Collections.emptyList();
        } else {
            List<CompletionItem> res = new ArrayList<CompletionItem>();
            int offset = JsonRpcHelpers.toOffset(unit.getBuffer(), line, column);
            CompletionProposalRequestor collector = this.initializeRequestor(unit, offset);
            if (offset > -1 && !monitor.isCanceled()) {
                IBuffer buffer = unit.getBuffer();
                if (buffer != null && buffer.getLength() >= offset) {
                    ProgressMonitorWrapper subMonitor = new ProgressMonitorWrapper(monitor) {
                        private long timeLimit;
                        private static final long TIMEOUT = 5000L;

                        public void beginTask(String name, int totalWork) {
                            this.timeLimit = System.currentTimeMillis() + TIMEOUT;
                        }

                        public boolean isCanceled() {
                            return super.isCanceled() || this.timeLimit <= System.currentTimeMillis();
                        }
                    };

                    try {
                        unit.codeComplete(offset, collector, subMonitor);
                        List<CompletionItem> completionItems = collector.getCompletionItems();
                        this.resolveCompletionItems(completionItems);
                        res.addAll(aixProvideCompletionItems(completionItems, unit, offset, monitor));
                        res.addAll(SnippetCompletionProposal.getSnippets(unit, collector.getContext(), subMonitor));
                        res.addAll((new JavadocCompletionProposal()).getProposals(unit, offset, collector, subMonitor));
                    } catch (OperationCanceledException var13) {
                        monitor.setCanceled(true);
                    }
                }
            }

            return res;
        }
    }
    
    public List<CompletionItem> aixProvideCompletionItems(List<CompletionItem> items, ICompilationUnit unit, int offset, IProgressMonitor monitor) {
    	return items;
    }
    

    private CompletionProposalRequestor initializeRequestor(ICompilationUnit unit, int offset) {
        CompletionProposalRequestor collector = new CompletionProposalRequestor(unit, offset);
        collector.setAllowsRequiredProposals(CompletionProposal.FIELD_REF, CompletionProposal.TYPE_REF, true);
        collector.setAllowsRequiredProposals(CompletionProposal.FIELD_REF, CompletionProposal.TYPE_IMPORT, true);
        collector.setAllowsRequiredProposals(CompletionProposal.FIELD_REF, CompletionProposal.FIELD_IMPORT, true);
        collector.setAllowsRequiredProposals(CompletionProposal.METHOD_REF, CompletionProposal.TYPE_REF, true);
        collector.setAllowsRequiredProposals(CompletionProposal.METHOD_REF, CompletionProposal.TYPE_IMPORT, true);
        collector.setAllowsRequiredProposals(CompletionProposal.METHOD_REF, CompletionProposal.METHOD_IMPORT, true);
        collector.setAllowsRequiredProposals(CompletionProposal.CONSTRUCTOR_INVOCATION, CompletionProposal.TYPE_REF, true);
        collector.setAllowsRequiredProposals(CompletionProposal.ANONYMOUS_CLASS_CONSTRUCTOR_INVOCATION, CompletionProposal.TYPE_REF, true);
        collector.setAllowsRequiredProposals(CompletionProposal.ANONYMOUS_CLASS_DECLARATION, CompletionProposal.TYPE_REF, true);
        collector.setAllowsRequiredProposals(CompletionProposal.TYPE_REF, CompletionProposal.TYPE_REF, true);
        collector.setFavoriteReferences(this.getFavoriteStaticMembers());
        return collector;
    }

    private String[] getFavoriteStaticMembers() {
        PreferenceManager preferenceManager = JavaLanguageServerPlugin.getPreferencesManager();
        return preferenceManager != null ? preferenceManager.getPreferences().getJavaCompletionFavoriteMembers() : new String[0];
    }

    @SuppressWarnings("unchecked")
	private void resolveCompletionItems(List<CompletionItem> items) {
        if (items.size() > 0) {
            Map<String, String> data = (Map<String, String>)((CompletionItem)items.get(0)).getData();
            long requestId = Long.parseLong((String)data.get("rid"));
            if (requestId > 0L) {
                this.fillProposalField(items, requestId);
            }
        }

    }

    @SuppressWarnings("unchecked")
	private void fillProposalField(List<CompletionItem> items, Long requestId) {
        CompletionResponse completionResponse = CompletionResponses.get(requestId);
        if (completionResponse != null) {
            List<CompletionProposal> proposals = completionResponse.getProposals();

            for(int i = 0; i < proposals.size(); ++i) {
                CompletionItem item = (CompletionItem)items.get(i);
                Map<String, String> data = (Map<String, String>)item.getData();
                this.setPythiaSignature(data, (CompletionProposal)proposals.get(i));
                item.setData(data);
            }
        }

    }

    private void setPythiaSignature(Map<String, String> data, CompletionProposal proposal) {
        switch(proposal.getKind()) {
        case CompletionProposal.METHOD_REF:
        case CompletionProposal.POTENTIAL_METHOD_DECLARATION:
        case CompletionProposal.METHOD_NAME_REFERENCE:
        case CompletionProposal.METHOD_REF_WITH_CASTED_RECEIVER:
        case CompletionProposal.CONSTRUCTOR_INVOCATION:
            data.put("pythia_signature", this.getPythiaSignature(proposal));
        default:
        }
    }

    private String getPythiaSignature(CompletionProposal proposal) {
        StringBuilder builder = new StringBuilder();
        builder.append(proposal.getName());
        builder.append('(');
        char[][] parameterTypes = Signature.getParameterTypes(proposal.getSignature());

        for(int i = 0; i < parameterTypes.length; ++i) {
            if (i > 0) {
                builder.append(", ");
            }

            builder.append(this.createTypeDisplayName(SignatureUtil.getLowerBound(parameterTypes[i])));
        }

        builder.append(')');
        return builder.toString();
    }

    private char[] createTypeDisplayName(char[] typeSignature) throws IllegalArgumentException {
        char[] displayName = Signature.getSimpleName(Signature.toCharArray(typeSignature));
        boolean useShortGenerics = false;
        if (useShortGenerics) {
            StringBuilder buf = new StringBuilder();
            buf.append(displayName);

            int pos;
            do {
                pos = buf.indexOf("? extends ");
                if (pos >= 0) {
                    buf.replace(pos, pos + 10, "+");
                } else {
                    pos = buf.indexOf("? super ");
                    if (pos >= 0) {
                        buf.replace(pos, pos + 8, "-");
                    }
                }
            } while(pos >= 0);

            return buf.toString().toCharArray();
        } else {
            return displayName;
        }
    }
}
